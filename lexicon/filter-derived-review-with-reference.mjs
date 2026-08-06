import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const REVIEW_PATH = process.argv[2] ?? "lexicon/generated/morphalou-derived-review.tsv";
const REFERENCE_PATH = process.argv[3] ?? "lexicon/sources/ods8.txt";
const ACCEPTED_OUTPUT_PATH = process.argv[4] ?? "lexicon/generated/ods8-derived-accepted-candidates.txt";
const REJECTED_OUTPUT_PATH = process.argv[5] ?? "lexicon/generated/ods8-derived-rejected-candidates.tsv";
const REPORT_PATH = process.argv[6] ?? "lexicon/generated/ods8-derived-review-report.json";
const REFERENCE_LABEL = process.argv[7] ?? "ODS 8";
const TARGET_DECISION = process.argv[8] ?? "candidate-after-ods-check";

const reviewSource = await readFile(REVIEW_PATH, "utf8");
let referenceSource;

try {
  referenceSource = await readFile(REFERENCE_PATH, "utf8");
} catch {
  console.error(`Source ${REFERENCE_LABEL} introuvable : ${REFERENCE_PATH}`);
  console.error("Place un fichier texte local légalement obtenu à cet emplacement. Il doit rester hors Git.");
  process.exit(2);
}

const referenceWords = parseWordList(referenceSource);
const reviewRows = parseReviewRows(reviewSource);
const targetRows = reviewRows.filter((row) => row.decision === TARGET_DECISION);
const accepted = new Map();
const rejected = new Map();
const report = {
  generatedAt: new Date().toISOString(),
  mode: "derived-review-reference-filter",
  reference: REFERENCE_LABEL,
  note: `Filtre local des formes dérivées en revue avec ${REFERENCE_LABEL}. La source de référence n'est pas intégrée au dictionnaire du jeu.`,
  targetDecision: TARGET_DECISION,
  inputs: {
    review: REVIEW_PATH,
    reference: REFERENCE_PATH
  },
  outputs: {
    accepted: ACCEPTED_OUTPUT_PATH,
    rejected: REJECTED_OUTPUT_PATH,
    report: REPORT_PATH
  },
  counts: {
    reviewRows: reviewRows.length,
    targetRows: targetRows.length,
    targetUnique: 0,
    acceptedOccurrences: 0,
    rejectedOccurrences: 0,
    accepted: 0,
    rejected: 0
  },
  acceptedByKind: {},
  rejectedByKind: {},
  acceptedByTense: {},
  rejectedByTense: {},
  acceptedByLength: {},
  rejectedByLength: {}
};

for (const row of targetRows) {
  if (referenceWords.has(row.word)) {
    accepted.set(row.word, mergeReviewRow(accepted.get(row.word), row));
    report.counts.acceptedOccurrences += 1;
    continue;
  }

  rejected.set(row.word, mergeReviewRow(rejected.get(row.word), row));
  report.counts.rejectedOccurrences += 1;
}

const acceptedWords = [...accepted.keys()].sort((first, second) => first.localeCompare(second));
const rejectedRows = [...rejected.values()].sort((first, second) => first.word.localeCompare(second.word));
report.counts.targetUnique = new Set(targetRows.map((row) => row.word)).size;
report.counts.accepted = acceptedWords.length;
report.counts.rejected = rejectedRows.length;

for (const row of accepted.values()) {
  count(report.acceptedByKind, row.kind);
  count(report.acceptedByTense, row.tense || "(vide)");
  count(report.acceptedByLength, String(row.word.length));
}

for (const row of rejected.values()) {
  count(report.rejectedByKind, row.kind);
  count(report.rejectedByTense, row.tense || "(vide)");
  count(report.rejectedByLength, String(row.word.length));
}

report.acceptedByKind = sortObject(report.acceptedByKind);
report.rejectedByKind = sortObject(report.rejectedByKind);
report.acceptedByTense = sortObject(report.acceptedByTense);
report.rejectedByTense = sortObject(report.rejectedByTense);
report.acceptedByLength = sortObject(report.acceptedByLength, numericKeySort);
report.rejectedByLength = sortObject(report.rejectedByLength, numericKeySort);

await mkdir(path.dirname(ACCEPTED_OUTPUT_PATH), { recursive: true });
await mkdir(path.dirname(REJECTED_OUTPUT_PATH), { recursive: true });
await mkdir(path.dirname(REPORT_PATH), { recursive: true });
await writeFile(ACCEPTED_OUTPUT_PATH, `${acceptedWords.join("\n")}\n`);
await writeFile(REJECTED_OUTPUT_PATH, `word\tkind\tdecision\tlemma\tcategory\tnumber\tgender\tmode\ttense\tperson\torigins\n${rejectedRows.map(formatReviewRow).join("\n")}\n`);
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

console.log(`Candidats dérivés acceptés par ${REFERENCE_LABEL} : ${acceptedWords.length} -> ${path.relative(process.cwd(), ACCEPTED_OUTPUT_PATH)}`);
console.log(`Candidats dérivés hors ${REFERENCE_LABEL} : ${report.counts.rejected} -> ${path.relative(process.cwd(), REJECTED_OUTPUT_PATH)}`);
console.log(`Rapport généré -> ${path.relative(process.cwd(), REPORT_PATH)}`);

function parseReviewRows(source) {
  const [headerLine, ...lines] = source.split(/\r?\n/);
  const headers = headerLine.split("\t");
  const rows = [];

  for (const line of lines) {
    if (!line.trim()) {
      continue;
    }

    const columns = line.split("\t");
    const row = Object.fromEntries(headers.map((header, index) => [header, columns[index] ?? ""]));
    row.word = normalizeWord(row.word);

    if (row.word) {
      rows.push(row);
    }
  }

  return rows;
}

function parseWordList(source) {
  const words = new Set();

  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const firstField = trimmed.split(/[\t,; ]+/)[0] ?? "";
    const normalizedWord = normalizeWord(firstField);

    if (normalizedWord) {
      words.add(normalizedWord);
    }
  }

  return words;
}

function formatReviewRow(row) {
  return [
    row.word,
    row.kind,
    row.decision,
    row.lemma,
    row.category,
    row.number,
    row.gender,
    row.mode,
    row.tense,
    row.person,
    row.origins
  ]
    .map((value) => String(value).replace(/\t/g, " "))
    .join("\t");
}

function mergeReviewRow(existing, row) {
  if (!existing) {
    return row;
  }

  return {
    ...existing,
    person: mergeValues(existing.person, row.person),
    origins: mergeValues(existing.origins, row.origins, " ")
  };
}

function mergeValues(first, second, separator = "/") {
  return [...new Set(`${first}${separator}${second}`.split(separator).filter(Boolean))].join(separator);
}

function normalizeWord(word) {
  return word
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^A-Za-z]/g, "")
    .toUpperCase();
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
