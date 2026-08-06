import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const PRIORITY_PATH = process.argv[2] ?? "lexicon/generated/ods8-missing-active-priority.tsv";
const METADATA_PATH = process.argv[3] ?? "lexicon/generated/lexique400-preview-metadata.json";
const GO6_QUALITY_PATH = process.argv[4] ?? "lexicon/generated/ods8-go6-active-quality-review.tsv";
const REVIEW_PATH = process.argv[5] ?? "lexicon/generated/active-short-words-review.tsv";
const ACCEPTED_PATH = process.argv[6] ?? "lexicon/generated/active-short-words-accepted.txt";
const REPORT_PATH = process.argv[7] ?? "lexicon/generated/active-short-words-review-report.json";

const priorityRows = parseRows(await readFile(PRIORITY_PATH, "utf8"));
const metadata = JSON.parse(await readFile(METADATA_PATH, "utf8"));
const ruleGeneratedRows = parseRows(await readFile(GO6_QUALITY_PATH, "utf8"));
const ruleGeneratedByWord = new Map(ruleGeneratedRows.map((row) => [row.word, row]));
const shortRows = priorityRows
  .filter((row) => Number(row.length) >= 2 && Number(row.length) <= 4)
  .map((row) => {
    const decision = decide(row, ruleGeneratedByWord.get(row.word), metadata);
    return {
      ...row,
      ...decision
    };
  })
  .sort(
    (first, second) =>
      decisionPriority(first.shortDecision) - decisionPriority(second.shortDecision) ||
      Number(first.length) - Number(second.length) ||
      first.word.localeCompare(second.word)
  );
const acceptedWords = shortRows
  .filter((row) => row.shortDecision === "accept-rule-generated-short")
  .map((row) => row.word)
  .sort((first, second) => first.localeCompare(second));
const report = {
  generatedAt: new Date().toISOString(),
  mode: "active-short-words-review",
  note: "Revue stricte des mots courts ODS 8 absents du lexique actif. ODS 8 reste une comparaison locale et ne fournit pas directement des mots distribuables.",
  inputs: {
    priority: PRIORITY_PATH,
    metadata: METADATA_PATH,
    go6Quality: GO6_QUALITY_PATH
  },
  outputs: {
    review: REVIEW_PATH,
    accepted: ACCEPTED_PATH,
    report: REPORT_PATH
  },
  counts: {
    reviewed: shortRows.length,
    accepted: acceptedWords.length,
    held: shortRows.filter((row) => row.shortDecision.startsWith("hold-")).length,
    rejected: shortRows.filter((row) => row.shortDecision.startsWith("reject-")).length
  },
  byLength: countBy(shortRows, "length"),
  byDecision: countBy(shortRows, "shortDecision"),
  byRecommendation: countBy(shortRows, "recommendation"),
  samples: sampleBy(shortRows, "shortDecision")
};
const tsvRows = [
  "word\tshortDecision\treason\tlength\trecommendation\tprimaryFamily\tinMorphalou\tinLefff\tlefffCategories\tfamilies\truleGeneratedDecision\truleGeneratedLemmas",
  ...shortRows.map((row) =>
    [
      row.word,
      row.shortDecision,
      row.reason,
      row.length,
      row.recommendation,
      row.primaryFamily,
      row.inMorphalou,
      row.inLefff,
      row.lefffCategories,
      row.families,
      row.ruleGeneratedDecision,
      row.ruleGeneratedLemmas
    ].join("\t")
  )
];

await mkdir(path.dirname(REVIEW_PATH), { recursive: true });
await writeFile(REVIEW_PATH, `${tsvRows.join("\n")}\n`);
await writeFile(ACCEPTED_PATH, `${acceptedWords.join("\n")}${acceptedWords.length > 0 ? "\n" : ""}`);
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

console.log(`Revue stricte mots courts -> ${path.relative(process.cwd(), REVIEW_PATH)}`);
console.log(`Mots courts acceptables -> ${path.relative(process.cwd(), ACCEPTED_PATH)} (${acceptedWords.length})`);
console.log(`Rapport -> ${path.relative(process.cwd(), REPORT_PATH)}`);
for (const [decision, count] of Object.entries(report.byDecision)) {
  console.log(`${decision}: ${count}`);
}

function decide(row, ruleGenerated, metadata) {
  if (row.recommendation === "exclude-proper-noun") {
    return {
      shortDecision: "reject-proper-noun",
      reason: "Lefff signale un nom propre ou une forme assimilee.",
      ruleGeneratedDecision: ruleGenerated?.qualityDecision ?? "",
      ruleGeneratedLemmas: ruleGenerated?.acceptedLemmas ?? ""
    };
  }

  if (ruleGenerated) {
    const lemmas = splitList(ruleGenerated.acceptedLemmas);
    const hasKnownVerbLemma = lemmas.some((lemma) => metadata[lemma]?.cr?.includes("VER"));
    if (hasKnownVerbLemma && ruleGenerated.qualityDecision === "review-before-activation") {
      return {
        shortDecision: "accept-rule-generated-short",
        reason: "Forme courte rattachée par règle à un lemme verbal déjà accepté ; acceptée explicitement par la revue stricte.",
        ruleGeneratedDecision: ruleGenerated.qualityDecision,
        ruleGeneratedLemmas: ruleGenerated.acceptedLemmas
      };
    }
  }

  if (row.inMorphalou === "yes" || row.inLefff === "yes") {
    return {
      shortDecision: "hold-open-source-review",
      reason: "Présence dans une source ouverte, mais le mot court doit être validé avec une explication avant intégration.",
      ruleGeneratedDecision: ruleGenerated?.qualityDecision ?? "",
      ruleGeneratedLemmas: ruleGenerated?.acceptedLemmas ?? ""
    };
  }

  return {
    shortDecision: "hold-ods-only-short-word",
    reason: "Présent seulement dans la comparaison ODS 8 locale ; ne pas intégrer sans source ouverte ou règle Sérénimot.",
    ruleGeneratedDecision: ruleGenerated?.qualityDecision ?? "",
    ruleGeneratedLemmas: ruleGenerated?.acceptedLemmas ?? ""
  };
}

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

function splitList(value) {
  return value ? value.split(",").filter(Boolean) : [];
}

function decisionPriority(decision) {
  return {
    "reject-proper-noun": 1,
    "hold-ods-only-short-word": 2,
    "hold-open-source-review": 3,
    "accept-rule-generated-short": 4
  }[decision] ?? 99;
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
