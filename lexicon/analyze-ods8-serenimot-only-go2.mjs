import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const CANDIDATES_PATH = process.argv[2] ?? "lexicon/generated/ods8-exclusion-candidates.tsv";
const LEFFF_METADATA_PATH = process.argv[3] ?? "lexicon/generated/lefff-metadata.json";
const REPORT_PATH = process.argv[4] ?? "lexicon/generated/ods8-go2-review-report.json";
const REVIEW_PATH = process.argv[5] ?? "lexicon/generated/ods8-go2-review.tsv";
const SUGGESTED_EXCLUSIONS_PATH = process.argv[6] ?? "lexicon/generated/ods8-go2-suggested-exclusions.txt";

const lefffMetadata = JSON.parse(await readFile(LEFFF_METADATA_PATH, "utf8"));
const rows = parseRows(await readFile(CANDIDATES_PATH, "utf8"));
const analyzedRows = rows.map((row) => {
  const groups = getGroups(row);
  const suggestion = getSuggestion(groups);

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
  mode: "ods8-serenimot-only-go2",
  note: "Revue GO2 des mots Sérénimot absents d'ODS 8. Les exclusions proposées sont limitées aux familles à faible risque.",
  inputs: {
    candidates: CANDIDATES_PATH,
    lefffMetadata: LEFFF_METADATA_PATH
  },
  outputs: {
    report: REPORT_PATH,
    review: REVIEW_PATH,
    suggestedExclusions: SUGGESTED_EXCLUSIONS_PATH
  },
  counts: {
    rows: analyzedRows.length,
    suggestedExclusions: suggestedExclusions.length,
    keepOrReview: analyzedRows.length - suggestedExclusions.length
  },
  byGroup: summarizeGroups(analyzedRows),
  bySuggestion: summarizeSuggestions(analyzedRows),
  samples: {
    suggestedExclusions: suggestedExclusions.slice(0, 200),
    keepOrReview: analyzedRows
      .filter((row) => row.suggestion !== "suggest-exclusion")
      .slice(0, 200)
      .map((row) => row.word)
  }
};
const tsvRows = [
  "word\tsuggestion\tgroups\tdecision\tlength\ttags\tflags\tcategories\tlemmas\tfrequency",
  ...analyzedRows.map((row) =>
    [
      row.word,
      row.suggestion,
      row.groups.join(","),
      row.decision,
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
await writeFile(REVIEW_PATH, `${tsvRows.join("\n")}\n`);
await writeFile(SUGGESTED_EXCLUSIONS_PATH, `${suggestedExclusions.join("\n")}\n`);

console.log(`Revue GO2 générée : ${analyzedRows.length} -> ${path.relative(process.cwd(), REPORT_PATH)}`);
console.log(`Exclusions GO2 suggérées : ${suggestedExclusions.length} -> ${path.relative(process.cwd(), SUGGESTED_EXCLUSIONS_PATH)}`);

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

function getGroups(row) {
  const groups = [];
  const lefff = lefffMetadata[row.word];
  const categorySet = new Set(row.categories);
  const tagSet = new Set(row.tags);

  if (lefff?.c?.["proper-noun"]) {
    groups.push("lefff-proper-noun");
  }
  if (looksLikeProperNoun(row)) {
    groups.push("proper-noun-likely");
  }
  if (looksLikeFunctionFragment(categorySet)) {
    groups.push("function-fragment");
  }
  if (categorySet.has("ADV") && tagSet.has("not-in-morphalou") && !lefff) {
    groups.push("prefix-or-foreign-adverb");
  }
  if (tagSet.has("short-word") && tagSet.has("not-in-morphalou") && !lefff) {
    groups.push("short-unattested");
  }
  if (tagSet.has("not-in-morphalou") && !lefff) {
    groups.push("absent-open-references");
  }

  if (groups.length === 0) {
    groups.push("keep-or-review");
  }

  return groups;
}

function getSuggestion(groups) {
  const groupSet = new Set(groups);

  if (
    groupSet.has("lefff-proper-noun") ||
    groupSet.has("proper-noun-likely") ||
    groupSet.has("function-fragment") ||
    groupSet.has("prefix-or-foreign-adverb") ||
    groupSet.has("short-unattested")
  ) {
    return "suggest-exclusion";
  }

  return "keep-or-review";
}

function looksLikeFunctionFragment(categorySet) {
  return (
    categorySet.has("CON") ||
    categorySet.has("PRE") ||
    categorySet.has("PRO:per") ||
    categorySet.has("PRO:int") ||
    categorySet.has("PRO:rel") ||
    categorySet.has("ART:ind")
  );
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

function summarizeGroups(rows) {
  const groups = {};

  for (const row of rows) {
    for (const group of row.groups) {
      groups[group] ??= { count: 0, examples: [] };
      groups[group].count += 1;
      if (groups[group].examples.length < 100) {
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
    if (suggestions[row.suggestion].examples.length < 100) {
      suggestions[row.suggestion].examples.push(row.word);
    }
  }

  return sortSummary(suggestions);
}

function sortSummary(summary) {
  return Object.fromEntries(Object.entries(summary).sort(([, first], [, second]) => second.count - first.count));
}
