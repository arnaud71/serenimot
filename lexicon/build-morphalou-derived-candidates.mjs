import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SERENIMOT_DICTIONARY_PATH = process.argv[2] ?? "public/static/dictionary/lexique383.txt";
const MORPHALOU_ZIP_PATH = process.argv[3] ?? "lexicon/sources/Morphalou3.1_formatCSV_toutEnUn.zip";
const OUTPUT_PATH = process.argv[4] ?? "lexicon/generated/morphalou-derived-accepted.txt";
const REPORT_PATH = process.argv[5] ?? "lexicon/generated/morphalou-derived-report.json";
const REVIEW_PATH = process.argv[6] ?? "lexicon/generated/morphalou-derived-review.tsv";
const CSV_ENTRY = "Morphalou3.1_formatCSV_toutEnUn/Morphalou3.1_CSV.csv";
const MIN_LENGTH = 2;
const MAX_LENGTH = 13;

const serenimotWords = parseWordList(await readFile(SERENIMOT_DICTIONARY_PATH, "utf8"));
const csv = readZipEntry(MORPHALOU_ZIP_PATH, CSV_ENTRY);
const lines = csv.split(/\r?\n/);
const headerIndex = lines.findIndex((line) => line.startsWith("GRAPHIE;ID;CAT"));

if (headerIndex === -1) {
  throw new Error("Impossible de trouver l'en-tête CSV Morphalou.");
}

const accepted = new Map();
const reviewRows = ["word\tkind\tdecision\tlemma\tcategory\tnumber\tgender\tmode\ttense\tperson\torigins"];
const report = {
  generatedAt: new Date().toISOString(),
  mode: "derived-candidates",
  note: "Candidats Morphalou ajoutables uniquement lorsque le lemme existe déjà dans Sérénimot.",
  inputs: {
    serenimot: SERENIMOT_DICTIONARY_PATH,
    morphalou: MORPHALOU_ZIP_PATH,
    zipEntry: CSV_ENTRY
  },
  outputs: {
    accepted: OUTPUT_PATH,
    review: REVIEW_PATH
  },
  counts: {
    serenimotBase: serenimotWords.size,
    accepted: 0,
    reviewed: 0,
    skipped: 0
  },
  acceptedByKind: {},
  acceptedByLength: {},
  reviewedByKind: {},
  reviewedByLength: {},
  reviewedByMode: {},
  reviewedByTense: {},
  reviewedByPerson: {},
  reviewedByDecision: {},
  skippedByReason: {}
};

let currentLemma = "";
let currentCategory = "";
let currentLemmaOrigins = "";

for (const line of lines.slice(headerIndex + 1)) {
  if (!line.trim()) {
    continue;
  }

  const row = parseMorphalouRow(parseCsvLine(line));

  if (row.lemmaGraphie) {
    currentLemma = row.lemmaGraphie;
  }
  if (row.lemmaCategory) {
    currentCategory = row.lemmaCategory;
  }
  if (row.lemmaOrigins) {
    currentLemmaOrigins = row.lemmaOrigins;
  }

  const lemmaWord = normalizeWord(currentLemma);
  const flexWord = normalizeWord(row.flexGraphie);
  const trace = {
    word: flexWord,
    rawWord: row.flexGraphie,
    kind: classifyDerivedForm(currentCategory, row),
    lemma: lemmaWord,
    category: currentCategory,
    number: row.flexNumber,
    gender: row.flexGender,
    mode: row.flexMode,
    tense: row.flexTense,
    person: row.flexPerson,
    origins: row.flexOrigins || currentLemmaOrigins
  };
  const rejectionReason = getRejectionReason(trace, serenimotWords);

  if (rejectionReason) {
    report.counts.skipped += 1;
    count(report.skippedByReason, rejectionReason);
    continue;
  }

  if (isAutoAcceptedKind(trace.kind)) {
    accepted.set(flexWord, mergeCandidate(accepted.get(flexWord), trace));
    count(report.acceptedByKind, trace.kind);
    count(report.acceptedByLength, String(flexWord.length));
    continue;
  }

  const reviewDecision = getReviewDecision(trace);
  report.counts.reviewed += 1;
  count(report.reviewedByKind, trace.kind);
  count(report.reviewedByLength, String(flexWord.length));
  count(report.reviewedByMode, trace.mode || "(vide)");
  count(report.reviewedByTense, trace.tense || "(vide)");
  count(report.reviewedByPerson, trace.person || "(vide)");
  count(report.reviewedByDecision, reviewDecision);
  reviewRows.push(formatReviewRow(trace, reviewDecision));
}

const acceptedWords = [...accepted.keys()].sort((first, second) => first.localeCompare(second));
report.counts.accepted = acceptedWords.length;
report.acceptedByKind = sortObject(report.acceptedByKind);
report.acceptedByLength = sortObject(report.acceptedByLength, numericKeySort);
report.reviewedByKind = sortObject(report.reviewedByKind);
report.reviewedByLength = sortObject(report.reviewedByLength, numericKeySort);
report.reviewedByMode = sortObject(report.reviewedByMode);
report.reviewedByTense = sortObject(report.reviewedByTense);
report.reviewedByPerson = sortObject(report.reviewedByPerson);
report.reviewedByDecision = sortObject(report.reviewedByDecision);
report.skippedByReason = sortObject(report.skippedByReason);

await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
await mkdir(path.dirname(REPORT_PATH), { recursive: true });
await mkdir(path.dirname(REVIEW_PATH), { recursive: true });
await writeFile(OUTPUT_PATH, `${acceptedWords.join("\n")}\n`);
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(REVIEW_PATH, `${reviewRows.join("\n")}\n`);

console.log(`Formes dérivées Morphalou acceptées : ${acceptedWords.length} -> ${path.relative(process.cwd(), OUTPUT_PATH)}`);
console.log(`Rapport généré -> ${path.relative(process.cwd(), REPORT_PATH)}`);
console.log(`Candidats en revue -> ${path.relative(process.cwd(), REVIEW_PATH)}`);

function parseWordList(source) {
  return new Set(
    source
      .split(/\r?\n/)
      .map((word) => normalizeWord(word))
      .filter(Boolean)
  );
}

function readZipEntry(zipPath, entryPath) {
  const result = spawnSync("unzip", ["-p", zipPath, entryPath], {
    encoding: "utf8",
    maxBuffer: 512 * 1024 * 1024
  });

  if (result.status !== 0) {
    console.error(result.stderr);
    throw new Error(`Impossible de lire ${entryPath} dans ${zipPath}.`);
  }

  return result.stdout;
}

function parseMorphalouRow(columns) {
  return {
    lemmaGraphie: getColumn(columns, 0),
    lemmaCategory: getColumn(columns, 2),
    lemmaOrigins: getColumn(columns, 8),
    flexGraphie: getColumn(columns, 9),
    flexNumber: getColumn(columns, 11),
    flexMode: getColumn(columns, 12),
    flexGender: getColumn(columns, 13),
    flexTense: getColumn(columns, 14),
    flexPerson: getColumn(columns, 15),
    flexOrigins: getColumn(columns, 17)
  };
}

function classifyDerivedForm(category, row) {
  if (category === "Nom commun" && row.flexNumber === "plural") {
    return "noun-plural";
  }
  if (category === "Adjectif qualificatif") {
    return "adjective-form";
  }
  if (category === "Verbe" && row.flexMode === "participle") {
    return "verb-participle";
  }
  if (category === "Verbe" && ["indicative", "conditional", "imperative", "subjunctive"].includes(row.flexMode)) {
    return `verb-${row.flexMode}`;
  }
  if (["Déterminant", "Pronom"].includes(category)) {
    return "function-word-form";
  }
  return "needs-review";
}

function isAutoAcceptedKind(kind) {
  return ["noun-plural", "adjective-form", "verb-participle", "verb-indicative"].includes(kind);
}

function getReviewDecision(trace) {
  if (trace.kind === "verb-imperative") {
    return "candidate-next-wave";
  }
  if (trace.kind === "verb-conditional") {
    return "candidate-after-ods-check";
  }
  if (trace.kind === "verb-subjunctive" && trace.tense === "present") {
    return "candidate-after-ods-check";
  }
  if (trace.kind === "verb-subjunctive" && trace.tense === "imperfect") {
    return "keep-out-by-default";
  }
  if (trace.kind === "function-word-form") {
    return "manual-review";
  }
  return "manual-review";
}

function getRejectionReason(trace, serenimotWords) {
  if (!trace.rawWord) {
    return "empty-flexion";
  }
  if (!trace.lemma || !serenimotWords.has(trace.lemma)) {
    return "lemma-not-in-serenimot";
  }
  if (!/^[\p{Letter}]+$/u.test(trace.rawWord)) {
    return "non-letter-form";
  }
  if (!trace.word) {
    return "empty-after-normalization";
  }
  if (trace.word.length < MIN_LENGTH) {
    return "too-short";
  }
  if (trace.word.length > MAX_LENGTH) {
    return "too-long";
  }
  if (serenimotWords.has(trace.word)) {
    return "already-in-serenimot";
  }
  if (trace.category === "Nom commun" && trace.number !== "plural") {
    return "noun-not-plural-derived";
  }
  return null;
}

function mergeCandidate(existing, trace) {
  if (!existing) {
    return trace;
  }
  return {
    ...existing,
    origins: [...new Set(`${existing.origins} ${trace.origins}`.split(/\s+/).filter(Boolean))].join(" ")
  };
}

function parseCsvLine(line) {
  const columns = [];
  let current = "";
  let quoted = false;

  for (const char of line) {
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === ";" && !quoted) {
      columns.push(current);
      current = "";
      continue;
    }
    current += char;
  }

  columns.push(current);
  return columns;
}

function formatReviewRow(trace, reviewDecision) {
  return [
    trace.word,
    trace.kind,
    reviewDecision,
    trace.lemma,
    trace.category,
    trace.number,
    trace.gender,
    trace.mode,
    trace.tense,
    trace.person,
    trace.origins
  ]
    .map((value) => String(value).replace(/\t/g, " "))
    .join("\t");
}

function getColumn(columns, index) {
  return (columns[index] ?? "").trim();
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
