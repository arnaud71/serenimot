import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const REVIEW_PATH = process.argv[2] ?? "lexicon/generated/ods8-missing-active-review.tsv";
const SUMMARY_PATH = process.argv[3] ?? "lexicon/generated/ods8-missing-active-summary.json";
const PRIORITY_PATH = process.argv[4] ?? "lexicon/generated/ods8-missing-active-priority.tsv";
const MAX_PLAYABLE_LENGTH = 13;

const rows = parseRows(await readFile(REVIEW_PATH, "utf8")).map((row) => ({
  ...row,
  recommendation: getRecommendation(row)
}));

const playableRows = rows.filter((row) => row.length <= MAX_PLAYABLE_LENGTH);
const summary = {
  generatedAt: new Date().toISOString(),
  mode: "ods8-missing-active-summary",
  note: "Synthese actionnable des mots ODS 8 absents du lexique actif 4.00.5. ODS reste une reference locale non distribuee.",
  inputs: {
    review: REVIEW_PATH
  },
  outputs: {
    summary: SUMMARY_PATH,
    priority: PRIORITY_PATH
  },
  counts: {
    missing: rows.length,
    playableLength: playableRows.length,
    overBoardLimit: rows.length - playableRows.length
  },
  byRecommendation: countBy(rows, "recommendation"),
  playableByRecommendation: countBy(playableRows, "recommendation"),
  playableByLength: countBy(playableRows, "length"),
  playableByPrimaryFamily: countBy(playableRows, "primaryFamily"),
  sourceCoverage: {
    playableInMorphalou: playableRows.filter((row) => row.inMorphalou).length,
    playableInLefff: playableRows.filter((row) => row.inLefff).length,
    playableInBothOpen: playableRows.filter((row) => row.inMorphalou && row.inLefff).length,
    playableInNeitherOpen: playableRows.filter((row) => !row.inMorphalou && !row.inLefff).length
  },
  samples: sampleBy(playableRows, "recommendation")
};

const priorityRows = [
  "word\tlength\trecommendation\tprimaryFamily\tinMorphalou\tinLefff\tlefffCategories\tfamilies",
  ...playableRows
    .filter((row) => row.recommendation !== "ignore-over-board-limit")
    .sort((first, second) => {
      const priority = recommendationPriority(first.recommendation) - recommendationPriority(second.recommendation);
      return priority || first.length - second.length || first.word.localeCompare(second.word);
    })
    .map((row) =>
      [
        row.word,
        row.length,
        row.recommendation,
        row.primaryFamily,
        row.inMorphalou ? "yes" : "no",
        row.inLefff ? "yes" : "no",
        row.lefffCategories.join(","),
        row.families.join(",")
      ].join("\t")
    )
];

await mkdir(path.dirname(SUMMARY_PATH), { recursive: true });
await writeFile(SUMMARY_PATH, `${JSON.stringify(summary, null, 2)}\n`);
await writeFile(PRIORITY_PATH, `${priorityRows.join("\n")}\n`);

console.log(`Synthese ODS 8 absents actif -> ${path.relative(process.cwd(), SUMMARY_PATH)}`);
console.log(`Priorites -> ${path.relative(process.cwd(), PRIORITY_PATH)}`);
console.log(`Absents : ${summary.counts.missing}`);
console.log(`Jouables : ${summary.counts.playableLength}`);
for (const [recommendation, count] of Object.entries(summary.playableByRecommendation)) {
  console.log(`${recommendation}: ${count}`);
}

function getRecommendation(row) {
  const familySet = new Set(row.families);
  const categorySet = new Set(row.lefffCategories);

  if (row.length > MAX_PLAYABLE_LENGTH) {
    return "ignore-over-board-limit";
  }
  if (familySet.has("blocked-lefff-proper-noun")) {
    return "exclude-proper-noun";
  }
  if (familySet.has("short-word")) {
    return "review-short-word";
  }
  if (familySet.has("verb-inflection")) {
    return "review-verb-inflection";
  }
  if (familySet.has("verb-suffix-ambiguous")) {
    return "review-ambiguous-verb-or-derived";
  }
  if (familySet.has("derived-noun")) {
    return "review-derived-noun";
  }
  if (familySet.has("adjective-or-participle")) {
    return "review-adjective-or-participle";
  }
  if (row.inMorphalou && row.inLefff && !categorySet.has("proper-noun")) {
    return "review-open-cross-source";
  }
  if (row.inMorphalou || row.inLefff) {
    return "review-open-single-source";
  }
  return "review-no-open-source";
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
        length: Number(row.length),
        inMorphalou: row.inMorphalou === "yes",
        inLefff: row.inLefff === "yes",
        lefffCategories: splitList(row.lefffCategories),
        families: splitList(row.families),
        primaryFamily: row.primaryFamily
      };
    });
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

function sampleBy(rows, property) {
  const samples = {};
  for (const row of rows) {
    const key = row[property];
    samples[key] ??= [];
    if (samples[key].length < 120) {
      samples[key].push(row.word);
    }
  }
  return samples;
}

function recommendationPriority(recommendation) {
  const priorities = {
    "exclude-proper-noun": 1,
    "review-short-word": 2,
    "review-open-cross-source": 3,
    "review-verb-inflection": 4,
    "review-ambiguous-verb-or-derived": 5,
    "review-derived-noun": 6,
    "review-adjective-or-participle": 7,
    "review-open-single-source": 8,
    "review-no-open-source": 9
  };
  return priorities[recommendation] ?? 99;
}

function sortCounts(counts) {
  return Object.fromEntries(Object.entries(counts).sort(([, first], [, second]) => second - first));
}
