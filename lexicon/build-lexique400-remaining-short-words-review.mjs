import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ANALYSIS_TSV_PATH = process.argv[2] ?? "lexicon/generated/lexique400-candidate-ods8-only-analysis.tsv";
const FILTERED_CANDIDATE_PATH = process.argv[3] ?? "lexicon/generated/lexique400-candidate-filtered-short.txt";
const REVIEW_PATH = process.argv[4] ?? "lexicon/generated/lexique400-remaining-short-words-review.tsv";
const REPORT_PATH = process.argv[5] ?? "lexicon/generated/lexique400-remaining-short-words-review-report.json";

const rows = parseRows(await readFile(ANALYSIS_TSV_PATH, "utf8"));
const filteredCandidate = parseWordSet(await readFile(FILTERED_CANDIDATE_PATH, "utf8"));
const remainingShortRows = rows
  .filter((row) => filteredCandidate.has(row.word) && row.length >= 2 && row.length <= 4)
  .map((row) => {
    const review = getReview(row);
    return {
      ...row,
      reviewDecision: review.decision,
      reviewPriority: review.priority,
      reviewReason: review.reason,
      sourceSummary: getSourceSummary(row)
    };
  })
  .sort(
    (first, second) =>
      first.reviewPriority - second.reviewPriority ||
      first.length - second.length ||
      first.word.localeCompare(second.word)
  );

const report = {
  generatedAt: new Date().toISOString(),
  mode: "lexique400-remaining-short-words-review",
  note: "Revue lisible des mots courts encore absents d'ODS 8 apres les deux vagues d'exclusion candidates. Ce rapport ne modifie pas le dictionnaire actif.",
  inputs: {
    analysis: ANALYSIS_TSV_PATH,
    filteredCandidate: FILTERED_CANDIDATE_PATH
  },
  outputs: {
    review: REVIEW_PATH,
    report: REPORT_PATH
  },
  counts: {
    reviewed: remainingShortRows.length
  },
  byLength: countBy(remainingShortRows, "length"),
  byDecision: countBy(remainingShortRows, "reviewDecision"),
  byOrigin: countBy(remainingShortRows, "primaryOrigin"),
  byPriority: countBy(remainingShortRows, "reviewPriority"),
  byCategory: countByList(remainingShortRows, "categories"),
  samples: sampleBy(remainingShortRows, "reviewDecision")
};

const tsvRows = [
  "word\treviewDecision\treviewPriority\treviewReason\tlength\torigin\tsourceSummary\tfrequency\tcategories\tlemmas\triskTags\tpreviousDecision",
  ...remainingShortRows.map((row) =>
    [
      row.word,
      row.reviewDecision,
      row.reviewPriority,
      row.reviewReason,
      row.length,
      row.primaryOrigin,
      row.sourceSummary,
      row.frequency,
      row.categories.join(","),
      row.lemmas.join(","),
      row.riskTags.join(","),
      row.decision
    ].join("\t")
  )
];

await mkdir(path.dirname(REVIEW_PATH), { recursive: true });
await mkdir(path.dirname(REPORT_PATH), { recursive: true });
await writeFile(REVIEW_PATH, `${tsvRows.join("\n")}\n`);
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

console.log(`Revue mots courts restants -> ${path.relative(process.cwd(), REVIEW_PATH)}`);
console.log(`Rapport -> ${path.relative(process.cwd(), REPORT_PATH)}`);
console.log(`Mots courts restants : ${remainingShortRows.length}`);
for (const [decision, count] of Object.entries(report.byDecision)) {
  console.log(`${decision}: ${count}`);
}

function getReview(row) {
  const sources = new Set(row.sourceTags);
  const risks = new Set(row.riskTags);
  const categories = new Set(row.categories);
  const isCurrent = sources.has("in-current-serenimot");
  const isMorphalou = sources.has("in-morphalou");
  const isLefff = sources.has("in-lefff");
  const isExpressive = risks.has("onomatopoeia-or-interjection") || categories.has("ONO");
  const isVerb = categories.has("VER") || row.categories.some((category) => category.toLowerCase().includes("verb"));
  const isForeignLike = row.categories.some((category) => ["adverb", "noun", "adjective"].includes(category));

  if (isCurrent && (isMorphalou || isLefff)) {
    return {
      decision: "keep-existing-cross-sourced",
      priority: 4,
      reason: "Deja present dans Serenimot et confirme par au moins une source ouverte."
    };
  }
  if (isExpressive) {
    return {
      decision: "review-expressive-word",
      priority: 3,
      reason: "Interjection ou onomatopee potentielle a decider selon les regles du jeu."
    };
  }
  if (isMorphalou && isLefff && row.frequency >= 0.1) {
    return {
      decision: "review-keep-cross-source",
      priority: 3,
      reason: "Present dans Morphalou et Lefff avec frequence non nulle."
    };
  }
  if (isMorphalou && isLefff) {
    return {
      decision: "review-rare-cross-source",
      priority: 2,
      reason: "Present dans deux sources ouvertes mais tres rare ou absent d'ODS 8."
    };
  }
  if (isVerb && row.frequency < 0.1) {
    return {
      decision: "review-rare-inflected-form",
      priority: 2,
      reason: "Forme verbale courte rare, a verifier avant integration."
    };
  }
  if (isMorphalou && row.frequency >= 1) {
    return {
      decision: "review-keep-common-morphalou",
      priority: 3,
      reason: "Present dans Morphalou avec frequence confortable, mais absent d'ODS 8."
    };
  }
  if (isForeignLike && !isCurrent) {
    return {
      decision: "review-foreign-or-borrowed",
      priority: 2,
      reason: "Categorie Lefff anglophone ou emprunt probable, a regler explicitement."
    };
  }
  if (isMorphalou) {
    return {
      decision: "review-rare-morphalou",
      priority: 2,
      reason: "Present dans Morphalou seulement, souvent rare."
    };
  }
  return {
    decision: "manual-review",
    priority: 1,
    reason: "Signal insuffisant pour decider automatiquement."
  };
}

function getSourceSummary(row) {
  const sources = new Set(row.sourceTags);
  const summary = [];
  if (sources.has("in-current-serenimot")) summary.push("current");
  if (sources.has("in-lexique400")) summary.push("lexique400");
  if (sources.has("in-morphalou")) summary.push("morphalou");
  if (sources.has("in-lefff")) summary.push("lefff");
  if (sources.has("retained-from-383-review")) summary.push("retained383");
  return summary.join(",");
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
        frequency: Number(row.frequency || 0)
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
    if (samples[value].length < 80) {
      samples[value].push(row.word);
    }
  }
  return samples;
}

function sortCounts(counts) {
  return Object.fromEntries(Object.entries(counts).sort(([, first], [, second]) => second - first));
}
