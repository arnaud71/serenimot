import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const QUALITY_REVIEW_PATH = process.argv[2];
const OUTPUT_PATH = process.argv[3];
const REPORT_PATH = process.argv[4];
const ACCEPTED_DECISIONS = new Set(["auto-accept", "accept-with-note"]);

if (!QUALITY_REVIEW_PATH || !OUTPUT_PATH || !REPORT_PATH) {
  throw new Error("Usage: node lexicon/filter-rule-generation-quality.mjs <quality.tsv> <accepted.txt> <report.json>");
}

const rows = parseRows(await readFile(QUALITY_REVIEW_PATH, "utf8"));
const acceptedRows = rows.filter((row) => ACCEPTED_DECISIONS.has(row.qualityDecision));
const report = {
  generatedAt: new Date().toISOString(),
  mode: "rule-generation-quality-filter",
  note: "Filtre les formes generees par regles pour ne garder que celles acceptables avant activation.",
  inputs: {
    qualityReview: QUALITY_REVIEW_PATH
  },
  outputs: {
    accepted: OUTPUT_PATH,
    report: REPORT_PATH
  },
  acceptedDecisions: [...ACCEPTED_DECISIONS],
  counts: {
    reviewed: rows.length,
    accepted: acceptedRows.length,
    excluded: rows.length - acceptedRows.length
  },
  byDecision: countBy(rows, "qualityDecision"),
  excludedSamples: rows
    .filter((row) => !ACCEPTED_DECISIONS.has(row.qualityDecision))
    .slice(0, 200)
    .map((row) => ({
      word: row.word,
      qualityDecision: row.qualityDecision,
      riskTags: row.riskTags,
      acceptedRules: row.acceptedRules,
      acceptedLemmas: row.acceptedLemmas
    }))
};
const acceptedWords = acceptedRows.map((row) => row.word).sort((first, second) => first.localeCompare(second));

await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
await writeFile(OUTPUT_PATH, `${acceptedWords.join("\n")}\n`);
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

console.log(`Formes pretes a activation : ${acceptedWords.length} -> ${path.relative(process.cwd(), OUTPUT_PATH)}`);
console.log(`Rapport filtre -> ${path.relative(process.cwd(), REPORT_PATH)}`);

function parseRows(source) {
  const [headerLine, ...lines] = source.split(/\r?\n/);
  const headers = headerLine.split("\t");

  return lines
    .filter((line) => line.trim())
    .map((line) => {
      const columns = line.split("\t");
      return Object.fromEntries(headers.map((header, index) => [header, columns[index] ?? ""]));
    });
}

function countBy(rows, property) {
  const counts = {};
  for (const row of rows) {
    counts[row[property]] = (counts[row[property]] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([, first], [, second]) => second - first));
}
