import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const INPUT_PATH = process.argv[2] ?? "lexicon/generated/ods8-exclusion-candidates.tsv";
const OUTPUT_PATH = process.argv[3] ?? "lexicon/generated/ods8-auto-exclusions.txt";
const TARGET_DECISION = process.argv[4] ?? "exclude";

const source = await readFile(INPUT_PATH, "utf8");
const [headerLine, ...lines] = source.split(/\r?\n/);
const headers = headerLine.split("\t");
const wordIndex = headers.indexOf("word");
const decisionIndex = headers.indexOf("decision");

if (wordIndex === -1 || decisionIndex === -1) {
  throw new Error(`Le fichier ${INPUT_PATH} doit contenir les colonnes word et decision.`);
}

const excludedWords = new Set();

for (const line of lines) {
  if (!line.trim()) {
    continue;
  }

  const columns = line.split("\t");
  const decision = columns[decisionIndex] ?? "";
  const word = normalizeWord(columns[wordIndex] ?? "");

  if (decision === TARGET_DECISION && word) {
    excludedWords.add(word);
  }
}

const sortedWords = [...excludedWords].sort((first, second) => first.localeCompare(second));

await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
await writeFile(OUTPUT_PATH, `${sortedWords.join("\n")}\n`);

console.log(`Exclusions automatiques générées : ${sortedWords.length} -> ${path.relative(process.cwd(), OUTPUT_PATH)}`);

function normalizeWord(word) {
  return word
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^A-Za-z]/g, "")
    .toUpperCase();
}
