import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const INPUT_PATH = process.argv[2] ?? "lexicon/generated/ods8-exclusion-candidates.tsv";
const REPORT_PATH = process.argv[3] ?? "lexicon/generated/ods8-priority-review-report.json";
const TSV_OUTPUT_PATH = process.argv[4] ?? "lexicon/generated/ods8-priority-review.tsv";
const SUGGESTED_EXCLUSIONS_PATH = process.argv[5] ?? "lexicon/generated/ods8-priority-suggested-exclusions.txt";
const TARGET_DECISION = "review-high-priority";

const source = await readFile(INPUT_PATH, "utf8");
const rows = parseRows(source).filter((row) => row.decision === TARGET_DECISION);
const analyzedRows = rows.map((row) => {
  const groups = getPriorityGroups(row);
  const suggestion = getSuggestion(row, groups);

  return {
    ...row,
    groups,
    suggestion
  };
});
const suggestedExclusions = analyzedRows
  .filter((row) => row.suggestion === "suggest-exclusion")
  .map((row) => row.word)
  .sort((first, second) => first.localeCompare(second));
const report = {
  generatedAt: new Date().toISOString(),
  mode: "priority-review",
  note: "Analyse des mots hors ODS 8 classés review-high-priority. Ce rapport ne modifie pas le dictionnaire.",
  inputs: {
    candidates: INPUT_PATH
  },
  outputs: {
    report: REPORT_PATH,
    review: TSV_OUTPUT_PATH,
    suggestedExclusions: SUGGESTED_EXCLUSIONS_PATH
  },
  counts: {
    priorityRows: analyzedRows.length,
    suggestedExclusions: suggestedExclusions.length,
    keepCandidates: analyzedRows.filter((row) => row.suggestion === "keep-candidate").length,
    manualReview: analyzedRows.filter((row) => row.suggestion === "manual-review").length
  },
  byGroup: summarizeGroups(analyzedRows),
  bySuggestion: summarizeSuggestions(analyzedRows),
  samples: {
    suggestedExclusions: suggestedExclusions.slice(0, 120),
    manualReview: analyzedRows
      .filter((row) => row.suggestion === "manual-review")
      .slice(0, 120)
      .map((row) => row.word),
    keepCandidates: analyzedRows
      .filter((row) => row.suggestion === "keep-candidate")
      .slice(0, 120)
      .map((row) => row.word)
  }
};
const tsvRows = [
  "word\tsuggestion\tgroups\tlength\ttags\tflags\tcategories\tlemmas\tfrequency",
  ...analyzedRows.map((row) =>
    [
      row.word,
      row.suggestion,
      row.groups.join(","),
      row.length,
      row.tags.join(","),
      row.flags.join(","),
      row.categories.join(","),
      row.lemmas.join(","),
      row.frequency
    ].join("\t")
  )
];

await mkdir(path.dirname(REPORT_PATH), { recursive: true });
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(TSV_OUTPUT_PATH, `${tsvRows.join("\n")}\n`);
await writeFile(SUGGESTED_EXCLUSIONS_PATH, `${suggestedExclusions.join("\n")}\n`);

console.log(`Revue prioritaire analysée : ${analyzedRows.length} -> ${path.relative(process.cwd(), REPORT_PATH)}`);
console.log(`Suggestions d'exclusion : ${suggestedExclusions.length} -> ${path.relative(process.cwd(), SUGGESTED_EXCLUSIONS_PATH)}`);

function parseRows(input) {
  const [headerLine, ...lines] = input.split(/\r?\n/);
  const headers = headerLine.split("\t");

  return lines
    .filter((line) => line.trim())
    .map((line) => {
      const columns = line.split("\t");
      const row = Object.fromEntries(headers.map((header, index) => [header, columns[index] ?? ""]));
      return {
        word: row.word,
        decision: row.decision,
        length: Number(row.length),
        tags: splitList(row.tags),
        flags: splitList(row.flags),
        categories: splitList(row.categories),
        lemmas: splitList(row.lemmas),
        frequency: Number(row.frequency)
      };
    });
}

function splitList(value) {
  return value ? value.split(",").filter(Boolean) : [];
}

function getPriorityGroups(row) {
  const tagSet = new Set(row.tags);
  const groups = [];

  if (tagSet.has("not-in-morphalou")) {
    groups.push("absent-morphalou");
  }
  if (tagSet.has("short-word")) {
    groups.push("short-word");
  }
  if (tagSet.has("short-low-frequency")) {
    groups.push("short-low-frequency");
  }
  if (looksLikeProperNoun(row)) {
    groups.push("proper-noun-likely");
  }
  if (looksLikeTechnicalTerm(row)) {
    groups.push("technical-or-rare");
  }
  if (tagSet.has("onomatopoeia-or-interjection")) {
    groups.push("onomatopoeia-or-interjection");
  }
  if (groups.length === 0) {
    groups.push("unclassified-priority");
  }

  return groups;
}

function getSuggestion(row, groups) {
  const groupSet = new Set(groups);

  if (groupSet.has("short-low-frequency")) {
    return "suggest-exclusion";
  }
  if (groupSet.has("onomatopoeia-or-interjection") && groupSet.has("absent-morphalou")) {
    return "suggest-exclusion";
  }
  if (!groupSet.has("absent-morphalou") && row.frequency >= 1) {
    return "keep-candidate";
  }
  return "manual-review";
}

function looksLikeProperNoun(row) {
  if (!row.tags.includes("not-in-morphalou")) {
    return false;
  }

  const properSuffixes = [
    "AIN",
    "AINE",
    "AIS",
    "AISE",
    "AND",
    "ANDE",
    "EEN",
    "EENNE",
    "IEN",
    "IENNE",
    "OIS",
    "OISE"
  ];

  return (
    row.categories.includes("NOM") &&
    row.length >= 5 &&
    properSuffixes.some((suffix) => row.word.endsWith(suffix))
  );
}

function looksLikeTechnicalTerm(row) {
  return row.tags.includes("not-in-morphalou") && row.length >= 8 && row.frequency < 1;
}

function summarizeGroups(rows) {
  const groups = {};

  for (const row of rows) {
    for (const group of row.groups) {
      groups[group] ??= { count: 0, examples: [] };
      groups[group].count += 1;
      if (groups[group].examples.length < 80) {
        groups[group].examples.push(row.word);
      }
    }
  }

  return sortSummary(groups);
}

function summarizeSuggestions(rows) {
  const suggestions = {};

  for (const row of rows) {
    suggestions[row.suggestion] ??= { count: 0, examples: [] };
    suggestions[row.suggestion].count += 1;
    if (suggestions[row.suggestion].examples.length < 80) {
      suggestions[row.suggestion].examples.push(row.word);
    }
  }

  return sortSummary(suggestions);
}

function sortSummary(summary) {
  return Object.fromEntries(Object.entries(summary).sort(([, first], [, second]) => second.count - first.count));
}
