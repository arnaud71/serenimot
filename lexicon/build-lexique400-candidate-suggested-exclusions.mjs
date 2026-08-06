import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ANALYSIS_TSV_PATH = process.argv[2] ?? "lexicon/generated/lexique400-candidate-ods8-only-analysis.tsv";
const OUTPUT_PATH = process.argv[3] ?? "lexicon/generated/lexique400-candidate-suggested-exclusions.txt";
const REPORT_PATH = process.argv[4] ?? "lexicon/generated/lexique400-candidate-suggested-exclusions-report.json";

const EXCLUSION_DECISIONS = new Set(["review-exclusion-high", "review-exclusion-medium"]);

const rows = parseRows(await readFile(ANALYSIS_TSV_PATH, "utf8"));
const suggestedExclusions = rows
  .filter((row) => EXCLUSION_DECISIONS.has(row.decision))
  .map((row) => row.word)
  .sort((first, second) => first.localeCompare(second));

const report = {
  generatedAt: new Date().toISOString(),
  mode: "lexique400-candidate-suggested-exclusions",
  note: "Liste candidate d'exclusions pour le candidat 4.00.1-preview. Elle n'est pas appliquee automatiquement.",
  inputs: {
    analysis: ANALYSIS_TSV_PATH
  },
  outputs: {
    suggestedExclusions: OUTPUT_PATH,
    report: REPORT_PATH
  },
  criteria: {
    decisions: [...EXCLUSION_DECISIONS].sort()
  },
  counts: {
    analyzedRows: rows.length,
    suggestedExclusions: suggestedExclusions.length,
    keptForReview: rows.length - suggestedExclusions.length
  },
  byDecision: summarize(rows, "decision"),
  suggestedByDecision: summarize(
    rows.filter((row) => EXCLUSION_DECISIONS.has(row.decision)),
    "decision"
  ),
  suggestedByOrigin: summarize(
    rows.filter((row) => EXCLUSION_DECISIONS.has(row.decision)),
    "primaryOrigin"
  ),
  suggestedByRiskTag: summarizeList(
    rows.filter((row) => EXCLUSION_DECISIONS.has(row.decision)),
    "riskTags"
  ),
  samples: {
    suggestedExclusions: suggestedExclusions.slice(0, 250),
    keptForReview: rows
      .filter((row) => !EXCLUSION_DECISIONS.has(row.decision))
      .slice(0, 250)
      .map((row) => row.word)
  }
};

await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
await mkdir(path.dirname(REPORT_PATH), { recursive: true });
await writeFile(OUTPUT_PATH, `${suggestedExclusions.join("\n")}\n`);
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

console.log(`Exclusions candidates -> ${path.relative(process.cwd(), OUTPUT_PATH)}`);
console.log(`Rapport -> ${path.relative(process.cwd(), REPORT_PATH)}`);
console.log(`Exclusions candidates : ${suggestedExclusions.length}`);

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
        currentSources: splitList(row.currentSources),
        currentFlags: splitList(row.currentFlags),
        frequency: Number(row.frequency || 0),
        removedRecommendation: row.removedRecommendation,
        removedStatus: row.removedStatus
      };
    });
}

function splitList(value) {
  return value ? value.split(",").filter(Boolean) : [];
}

function summarize(rows, property) {
  const summary = {};

  for (const row of rows) {
    const value = row[property] || "(vide)";
    summary[value] ??= { count: 0, examples: [] };
    summary[value].count += 1;
    if (summary[value].examples.length < 120) {
      summary[value].examples.push(row.word);
    }
  }

  return sortSummary(summary);
}

function summarizeList(rows, property) {
  const summary = {};

  for (const row of rows) {
    const values = row[property].length ? row[property] : ["(vide)"];
    for (const value of values) {
      summary[value] ??= { count: 0, examples: [] };
      summary[value].count += 1;
      if (summary[value].examples.length < 120) {
        summary[value].examples.push(row.word);
      }
    }
  }

  return sortSummary(summary);
}

function sortSummary(summary) {
  return Object.fromEntries(Object.entries(summary).sort(([, first], [, second]) => second.count - first.count));
}
