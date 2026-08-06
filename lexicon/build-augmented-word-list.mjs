import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE_WORDS_PATH = process.argv[2] ?? "public/static/dictionary/lexique4005.txt";
const ADDITIONS_PATH = process.argv[3] ?? "lexicon/generated/ods8-go5-active-rule-generated-accepted.txt";
const OUTPUT_PATH = process.argv[4] ?? "lexicon/generated/lexique400-preview-go5-candidate.txt";
const REPORT_PATH = process.argv[5] ?? "lexicon/generated/lexique400-preview-go5-candidate-report.json";

const baseWords = parseWordList(await readFile(BASE_WORDS_PATH, "utf8"));
const additionWords = parseWordList(await readFile(ADDITIONS_PATH, "utf8"));
const appliedAdditions = [...additionWords].filter((word) => !baseWords.has(word)).sort((first, second) => first.localeCompare(second));
const alreadyPresent = [...additionWords].filter((word) => baseWords.has(word)).sort((first, second) => first.localeCompare(second));
const outputWords = [...new Set([...baseWords, ...additionWords])].sort((first, second) => first.localeCompare(second));

const report = {
  generatedAt: new Date().toISOString(),
  mode: "augmented-word-list",
  note: "Fusion locale d'un lexique public avec des additions generees par regles. Ce script ne modifie pas le dictionnaire actif du jeu.",
  inputs: {
    baseWords: BASE_WORDS_PATH,
    additions: ADDITIONS_PATH
  },
  outputs: {
    wordList: OUTPUT_PATH,
    report: REPORT_PATH
  },
  counts: {
    base: baseWords.size,
    additions: additionWords.size,
    appliedAdditions: appliedAdditions.length,
    alreadyPresent: alreadyPresent.length,
    output: outputWords.length
  },
  byLength: {
    appliedAdditions: countByLength(appliedAdditions),
    output: countByLength(outputWords)
  },
  samples: {
    appliedAdditions: appliedAdditions.slice(0, 250),
    alreadyPresent: alreadyPresent.slice(0, 250)
  }
};

await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
await mkdir(path.dirname(REPORT_PATH), { recursive: true });
await writeFile(OUTPUT_PATH, `${outputWords.join("\n")}\n`);
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

console.log(`Liste augmentee -> ${path.relative(process.cwd(), OUTPUT_PATH)}`);
console.log(`Rapport -> ${path.relative(process.cwd(), REPORT_PATH)}`);
console.log(`Mots avant : ${baseWords.size}`);
console.log(`Ajouts appliques : ${appliedAdditions.length}`);
console.log(`Mots apres : ${outputWords.length}`);

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
