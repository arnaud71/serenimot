import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const INPUT_PATH = process.argv[2] ?? "lexicon/generated/lexique400-candidate.txt";
const EXCLUSIONS_PATH = process.argv[3] ?? "lexicon/generated/lexique400-candidate-suggested-exclusions.txt";
const OUTPUT_PATH = process.argv[4] ?? "lexicon/generated/lexique400-candidate-filtered.txt";
const REPORT_PATH = process.argv[5] ?? "lexicon/generated/lexique400-candidate-filtered-report.json";

const inputWords = parseWordList(await readFile(INPUT_PATH, "utf8"));
const exclusions = parseWordList(await readFile(EXCLUSIONS_PATH, "utf8"));
const appliedExclusions = [...exclusions].filter((word) => inputWords.has(word)).sort((first, second) => first.localeCompare(second));
const missingExclusions = [...exclusions].filter((word) => !inputWords.has(word)).sort((first, second) => first.localeCompare(second));
const filteredWords = [...inputWords].filter((word) => !exclusions.has(word)).sort((first, second) => first.localeCompare(second));

const report = {
  generatedAt: new Date().toISOString(),
  mode: "filtered-word-list",
  note: "Filtrage local d'un candidat lexical. Ce script ne modifie pas le dictionnaire actif du jeu.",
  inputs: {
    wordList: INPUT_PATH,
    exclusions: EXCLUSIONS_PATH
  },
  outputs: {
    wordList: OUTPUT_PATH,
    report: REPORT_PATH
  },
  counts: {
    input: inputWords.size,
    exclusions: exclusions.size,
    appliedExclusions: appliedExclusions.length,
    missingExclusions: missingExclusions.length,
    output: filteredWords.length
  },
  byLength: {
    appliedExclusions: countByLength(appliedExclusions),
    output: countByLength(filteredWords)
  },
  samples: {
    appliedExclusions: appliedExclusions.slice(0, 250),
    missingExclusions: missingExclusions.slice(0, 250)
  }
};

await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
await mkdir(path.dirname(REPORT_PATH), { recursive: true });
await writeFile(OUTPUT_PATH, `${filteredWords.join("\n")}\n`);
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

console.log(`Liste filtrée -> ${path.relative(process.cwd(), OUTPUT_PATH)}`);
console.log(`Rapport -> ${path.relative(process.cwd(), REPORT_PATH)}`);
console.log(`Mots avant : ${inputWords.size}`);
console.log(`Exclusions appliquées : ${appliedExclusions.length}`);
console.log(`Mots après : ${filteredWords.length}`);

function parseWordList(source) {
  return new Set(
    source
      .split(/\r?\n/)
      .map((line) => normalizeWord(line.trim().split(/[\t,; ]+/)[0] ?? ""))
      .filter(Boolean)
  );
}

function normalizeWord(word) {
  return word
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^A-Za-z]/g, "")
    .toUpperCase();
}

function countByLength(words) {
  const counts = {};
  for (const word of words) {
    counts[word.length] = (counts[word.length] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([first], [second]) => Number(first) - Number(second)));
}
