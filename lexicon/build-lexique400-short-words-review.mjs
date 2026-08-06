import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ANALYSIS_TSV_PATH = process.argv[2] ?? "lexicon/generated/lexique400-candidate-ods8-only-analysis.tsv";
const EXCLUSIONS_PATH = process.argv[3] ?? "lexicon/generated/lexique400-candidate-suggested-exclusions.txt";
const REVIEW_PATH = process.argv[4] ?? "lexicon/generated/lexique400-short-words-review.tsv";
const REPORT_PATH = process.argv[5] ?? "lexicon/generated/lexique400-short-words-review-report.json";

const rows = parseRows(await readFile(ANALYSIS_TSV_PATH, "utf8"));
const exclusions = parseWordSet(await readFile(EXCLUSIONS_PATH, "utf8"));
const shortRows = rows
  .filter((row) => row.length >= 2 && row.length <= 4 && !exclusions.has(row.word))
  .map((row) => ({
    ...row,
    shortWordDecision: getShortWordDecision(row)
  }))
  .sort((first, second) => first.length - second.length || first.word.localeCompare(second.word));

const report = {
  generatedAt: new Date().toISOString(),
  mode: "lexique400-short-words-review",
  note: "Revue des mots courts hors ODS 8 restant dans le candidat filtre. Ce rapport ne modifie pas le dictionnaire.",
  inputs: {
    analysis: ANALYSIS_TSV_PATH,
    exclusions: EXCLUSIONS_PATH
  },
  outputs: {
    review: REVIEW_PATH,
    report: REPORT_PATH
  },
  counts: {
    reviewed: shortRows.length,
    excludedBeforeReview: [...exclusions].filter((word) => {
      const row = rows.find((candidate) => candidate.word === word);
      return row && row.length >= 2 && row.length <= 4;
    }).length
  },
  byLength: countBy(shortRows, "length"),
  byDecision: countBy(shortRows, "shortWordDecision"),
  byOrigin: countBy(shortRows, "primaryOrigin"),
  bySourceTag: countByList(shortRows, "sourceTags"),
  byRiskTag: countByList(shortRows, "riskTags"),
  samples: sampleBy(shortRows, "shortWordDecision")
};

const tsvRows = [
  "word\tshortWordDecision\tpreviousDecision\torigin\tlength\tinLexique400\tinCurrent\tinMorphalou\tinLefff\tfrequency\triskTags\tcategories\tlemmas\tcurrentFlags\tremovedRecommendation",
  ...shortRows.map((row) =>
    [
      row.word,
      row.shortWordDecision,
      row.decision,
      row.primaryOrigin,
      row.length,
      row.sourceTags.includes("in-lexique400") ? "1" : "0",
      row.sourceTags.includes("in-current-serenimot") ? "1" : "0",
      row.sourceTags.includes("in-morphalou") ? "1" : "0",
      row.sourceTags.includes("in-lefff") ? "1" : "0",
      row.frequency,
      row.riskTags.join(","),
      row.categories.join(","),
      row.lemmas.join(","),
      row.currentFlags.join(","),
      row.removedRecommendation
    ].join("\t")
  )
];

await mkdir(path.dirname(REVIEW_PATH), { recursive: true });
await mkdir(path.dirname(REPORT_PATH), { recursive: true });
await writeFile(REVIEW_PATH, `${tsvRows.join("\n")}\n`);
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

console.log(`Revue mots courts -> ${path.relative(process.cwd(), REVIEW_PATH)}`);
console.log(`Rapport -> ${path.relative(process.cwd(), REPORT_PATH)}`);
console.log(`Mots courts revus : ${shortRows.length}`);
for (const [decision, count] of Object.entries(report.byDecision)) {
  console.log(`${decision}: ${count}`);
}

function getShortWordDecision(row) {
  const sourceTags = new Set(row.sourceTags);
  const riskTags = new Set(row.riskTags);

  if (sourceTags.has("in-current-serenimot") && (sourceTags.has("in-morphalou") || sourceTags.has("in-lefff"))) {
    return "keep-existing-cross-sourced";
  }
  if (sourceTags.has("in-morphalou") && !riskTags.has("absent-open-cross-sources")) {
    return "review-keep-morphalou";
  }
  if (sourceTags.has("in-lefff") && !riskTags.has("lefff-proper-noun")) {
    return "review-keep-lefff";
  }
  if (riskTags.has("onomatopoeia-or-interjection")) {
    return "review-special-interjection";
  }
  if (row.frequency >= 1) {
    return "review-keep-frequency";
  }
  return "review-short-uncertain";
}

function parseRows(source) {
  const [headerLine, ...lines] = source.split(/\r?\n/);
  const headers = headerLine.split("\t");

  return lines
    .filter((line) => line.trim())
    .map((line) => {
      const columns = line.split("\t");
      const row = Object.fromEntries(headers.map((header, index) => [header, columns[index] ?? ""]));
      return {
        word: row.word,
        decision: row.decision,
        primaryOrigin: row.primaryOrigin,
        length: Number(row.length),
        sourceTags: splitList(row.sourceTags),
        riskTags: splitList(row.riskTags),
        categories: splitList(row.categories),
        lemmas: splitList(row.lemmas),
        currentFlags: splitList(row.currentFlags),
        frequency: Number(row.frequency || 0),
        removedRecommendation: row.removedRecommendation
      };
    });
}

function parseWordSet(source) {
  return new Set(source.split(/\r?\n/).map((line) => line.trim()).filter(Boolean));
}

function splitList(value) {
  return value ? value.split(",").filter(Boolean) : [];
}

function countBy(rows, property) {
  const counts = {};
  for (const row of rows) {
    counts[row[property]] = (counts[row[property]] ?? 0) + 1;
  }
  return sortCounts(counts);
}

function countByList(rows, property) {
  const counts = {};
  for (const row of rows) {
    for (const value of row[property]) {
      counts[value] = (counts[value] ?? 0) + 1;
    }
  }
  return sortCounts(counts);
}

function sampleBy(rows, property) {
  const samples = {};
  for (const row of rows) {
    const value = row[property];
    samples[value] ??= [];
    if (samples[value].length < 120) {
      samples[value].push(row.word);
    }
  }
  return samples;
}

function sortCounts(counts) {
  return Object.fromEntries(Object.entries(counts).sort(([, first], [, second]) => second - first));
}
