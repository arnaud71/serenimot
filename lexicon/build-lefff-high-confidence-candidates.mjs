import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const INPUT_PATH = process.argv[2] ?? "lexicon/generated/lefff-enrichment-candidates.tsv";
const OUTPUT_PATH = process.argv[3] ?? "lexicon/generated/lefff-high-confidence-accepted.txt";
const REPORT_PATH = process.argv[4] ?? "lexicon/generated/lefff-high-confidence-report.json";
const ACCEPTED_BUCKET = "high-confidence-cross-source";

const source = await readFile(INPUT_PATH, "utf8");
const [headerLine, ...lines] = source.split(/\r?\n/);
const headers = headerLine.split("\t");
const indexes = Object.fromEntries(headers.map((header, index) => [header, index]));
const words = new Set();
const report = {
  generatedAt: new Date().toISOString(),
  mode: "lefff-high-confidence-extraction",
  note: "Formes absentes de Sérénimot mais confirmées par Lefff, Morphalou et ODS 8 local. ODS sert uniquement de filtre local.",
  input: INPUT_PATH,
  output: OUTPUT_PATH,
  acceptedBucket: ACCEPTED_BUCKET,
  counts: {
    rows: 0,
    accepted: 0,
    skipped: 0
  },
  skippedByBucket: {},
  acceptedByLength: {},
  samples: []
};

for (const line of lines) {
  if (!line.trim()) {
    continue;
  }

  report.counts.rows += 1;
  const columns = line.split("\t");
  const word = getColumn(columns, "word");
  const bucket = getColumn(columns, "bucket");

  if (bucket !== ACCEPTED_BUCKET) {
    report.counts.skipped += 1;
    count(report.skippedByBucket, bucket || "(vide)");
    continue;
  }

  words.add(word);
  count(report.acceptedByLength, String(word.length));

  if (report.samples.length < 100) {
    report.samples.push(word);
  }
}

const sortedWords = [...words].sort((first, second) => first.localeCompare(second));
report.counts.accepted = sortedWords.length;
report.acceptedByLength = sortObject(report.acceptedByLength, numericKeySort);
report.skippedByBucket = sortObject(report.skippedByBucket);

await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
await mkdir(path.dirname(REPORT_PATH), { recursive: true });
await writeFile(OUTPUT_PATH, `${sortedWords.join("\n")}\n`);
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

console.log(`Candidats Lefff haute confiance : ${sortedWords.length} -> ${path.relative(process.cwd(), OUTPUT_PATH)}`);
console.log(`Rapport généré -> ${path.relative(process.cwd(), REPORT_PATH)}`);

function getColumn(columns, name) {
  return (columns[indexes[name]] ?? "").trim();
}

function count(target, key) {
  target[key] = (target[key] ?? 0) + 1;
}

function sortObject(object, sorter = (first, second) => first.localeCompare(second)) {
  return Object.fromEntries(Object.entries(object).sort(([first], [second]) => sorter(first, second)));
}

function numericKeySort(first, second) {
  return Number(first) - Number(second);
}
