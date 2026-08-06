import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const REVIEW_PATH = process.argv[2] ?? "lexicon/generated/lexique400-short-words-review.tsv";
const EXCLUSIONS_PATH = process.argv[3] ?? "lexicon/generated/lexique400-short-word-suggested-exclusions.txt";
const REVIEW_OUTPUT_PATH = process.argv[4] ?? "lexicon/generated/lexique400-short-word-suggested-exclusions.tsv";
const REPORT_PATH = process.argv[5] ?? "lexicon/generated/lexique400-short-word-suggested-exclusions-report.json";

const rows = parseRows(await readFile(REVIEW_PATH, "utf8"));
const candidates = rows
  .map((row) => ({ ...row, exclusionReasons: getExclusionReasons(row) }))
  .filter((row) => row.exclusionReasons.length > 0)
  .sort((first, second) => first.length - second.length || first.word.localeCompare(second.word));

const report = {
  generatedAt: new Date().toISOString(),
  mode: "lexique400-short-word-suggested-exclusions",
  note: "Deuxieme vague prudente sur les mots courts du candidat Lexique 4.00. Cette sortie propose des exclusions, sans modifier le dictionnaire actif.",
  inputs: {
    review: REVIEW_PATH
  },
  outputs: {
    exclusions: EXCLUSIONS_PATH,
    review: REVIEW_OUTPUT_PATH,
    report: REPORT_PATH
  },
  rules: [
    "Ne jamais proposer un mot deja present dans le dictionnaire Serenimot courant.",
    "Ne traiter que les nouveaux mots Lexique 4.00 de 2 a 4 lettres encore absents d'ODS 8.",
    "Proposer les mots sans voyelle comme sigles ou abreviations suspects.",
    "Proposer les categories non lexicales, sauf onomatopees ou interjections.",
    "Proposer les categories numerales ou unites.",
    "Proposer les tres faibles frequences absentes de Lefff."
  ],
  counts: {
    reviewed: rows.length,
    suggestedExclusions: candidates.length
  },
  byLength: countBy(candidates, "length"),
  byDecision: countBy(candidates, "shortWordDecision"),
  byReason: countByList(candidates, "exclusionReasons"),
  byCategory: countByList(candidates, "categories"),
  samples: candidates.slice(0, 150).map((row) => row.word)
};

const reviewRows = [
  "word\treasons\tshortWordDecision\tpreviousDecision\torigin\tlength\tinLexique400\tinCurrent\tinMorphalou\tinLefff\tfrequency\triskTags\tcategories\tlemmas",
  ...candidates.map((row) =>
    [
      row.word,
      row.exclusionReasons.join(","),
      row.shortWordDecision,
      row.previousDecision,
      row.origin,
      row.length,
      row.inLexique400,
      row.inCurrent,
      row.inMorphalou,
      row.inLefff,
      row.frequency,
      row.riskTags.join(","),
      row.categories.join(","),
      row.lemmas.join(",")
    ].join("\t")
  )
];

await mkdir(path.dirname(EXCLUSIONS_PATH), { recursive: true });
await mkdir(path.dirname(REVIEW_OUTPUT_PATH), { recursive: true });
await mkdir(path.dirname(REPORT_PATH), { recursive: true });
await writeFile(EXCLUSIONS_PATH, `${candidates.map((row) => row.word).join("\n")}\n`);
await writeFile(REVIEW_OUTPUT_PATH, `${reviewRows.join("\n")}\n`);
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

console.log(`Exclusions mots courts proposees -> ${path.relative(process.cwd(), EXCLUSIONS_PATH)}`);
console.log(`Revue detaillee -> ${path.relative(process.cwd(), REVIEW_OUTPUT_PATH)}`);
console.log(`Rapport -> ${path.relative(process.cwd(), REPORT_PATH)}`);
console.log(`Mots courts proposes : ${candidates.length}`);
for (const [reason, count] of Object.entries(report.byReason)) {
  console.log(`${reason}: ${count}`);
}

function getExclusionReasons(row) {
  const reasons = [];
  const categories = new Set(row.categories);
  const riskTags = new Set(row.riskTags);
  const isExpressive = categories.has("ONO") || riskTags.has("onomatopoeia-or-interjection");

  if (row.inCurrent || row.origin !== "lexique400-new" || row.length < 2 || row.length > 4) {
    return reasons;
  }

  if (categories.has("non-lexical") && !isExpressive) {
    reasons.push("categorie-non-lexicale");
  }
  if (!/[AEIOUY]/.test(row.word)) {
    reasons.push("sans-voyelle-suspect-sigle");
  }
  if (categories.has("ADJ:num")) {
    reasons.push("categorie-numerale-ou-unite");
  }
  if (row.length <= 3 && !row.inLefff && riskTags.has("very-low-frequency")) {
    reasons.push("tres-faible-frequence-absent-lefff");
  }

  return [...new Set(reasons)];
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
        shortWordDecision: row.shortWordDecision,
        previousDecision: row.previousDecision,
        origin: row.origin,
        length: Number(row.length),
        inLexique400: row.inLexique400 === "1",
        inCurrent: row.inCurrent === "1",
        inMorphalou: row.inMorphalou === "1",
        inLefff: row.inLefff === "1",
        frequency: Number(row.frequency || 0),
        riskTags: splitList(row.riskTags),
        categories: splitList(row.categories),
        lemmas: splitList(row.lemmas)
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

function countByList(rows, property) {
  const counts = {};
  for (const row of rows) {
    for (const value of row[property]) {
      counts[value] = (counts[value] ?? 0) + 1;
    }
  }
  return sortCounts(counts);
}

function sortCounts(counts) {
  return Object.fromEntries(Object.entries(counts).sort(([, first], [, second]) => second - first));
}
