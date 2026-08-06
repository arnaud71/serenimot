import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const INPUT_ZIP_PATH = process.argv[2] ?? "lexicon/sources/Morphalou3.1_formatCSV_toutEnUn.zip";
const OUTPUT_PATH = process.argv[3] ?? "lexicon/generated/morphalou-forms.txt";
const REPORT_PATH = process.argv[4] ?? "lexicon/generated/morphalou-report.json";
const CSV_ENTRY = "Morphalou3.1_formatCSV_toutEnUn/Morphalou3.1_CSV.csv";
const MIN_LENGTH = 2;
const MAX_LENGTH = 13;

const csv = readZipEntry(INPUT_ZIP_PATH, CSV_ENTRY);
const lines = csv.split(/\r?\n/);
const headerIndex = lines.findIndex((line) => line.startsWith("GRAPHIE;ID;CAT"));

if (headerIndex === -1) {
  throw new Error("Impossible de trouver l'en-tête CSV Morphalou.");
}

const words = new Set();
const report = {
  generatedAt: new Date().toISOString(),
  mode: "reference-only",
  source: INPUT_ZIP_PATH,
  zipEntry: CSV_ENTRY,
  output: OUTPUT_PATH,
  note: "Liste Morphalou normalisée pour comparaison locale. Elle n'est pas intégrée au dictionnaire jouable.",
  rows: 0,
  acceptedWords: 0,
  acceptedOccurrences: 0,
  rejectedOccurrences: 0,
  categories: {},
  origins: {},
  lengths: {},
  rejectionsByReason: {}
};

let currentLemmaCategory = "";
let currentLemmaOrigin = "";

for (const line of lines.slice(headerIndex + 1)) {
  if (!line.trim()) {
    continue;
  }

  report.rows += 1;
  const columns = parseCsvLine(line);
  const row = parseMorphalouRow(columns);

  if (row.lemmaCategory) {
    currentLemmaCategory = row.lemmaCategory;
  }
  if (row.lemmaOrigins) {
    currentLemmaOrigin = row.lemmaOrigins;
  }

  if (row.lemmaGraphie) {
    addCandidate(row.lemmaGraphie, {
      category: row.lemmaCategory,
      origins: row.lemmaOrigins
    });
  }

  if (row.flexGraphie) {
    addCandidate(row.flexGraphie, {
      category: currentLemmaCategory,
      origins: row.flexOrigins || currentLemmaOrigin
    });
  }
}

const sortedWords = [...words].sort((first, second) => first.localeCompare(second));
report.acceptedWords = sortedWords.length;
report.lengths = sortObject(report.lengths, numericKeySort);
report.categories = sortObject(report.categories);
report.origins = sortObject(report.origins);
report.rejectionsByReason = sortObject(report.rejectionsByReason);

await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
await mkdir(path.dirname(REPORT_PATH), { recursive: true });
await writeFile(OUTPUT_PATH, `${sortedWords.join("\n")}\n`);
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

console.log(`Référence Morphalou générée : ${sortedWords.length} mots -> ${path.relative(process.cwd(), OUTPUT_PATH)}`);
console.log(`Rapport généré -> ${path.relative(process.cwd(), REPORT_PATH)}`);

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
    flexOrigins: getColumn(columns, 17)
  };
}

function addCandidate(rawWord, trace) {
  const rejectionReason = getRejectionReason(rawWord);

  if (rejectionReason) {
    report.rejectedOccurrences += 1;
    count(report.rejectionsByReason, rejectionReason);
    return;
  }

  const word = normalizeWord(rawWord);
  words.add(word);
  report.acceptedOccurrences += 1;
  count(report.lengths, String(word.length));

  if (trace.category) {
    count(report.categories, trace.category);
  }

  for (const origin of trace.origins.split(/\s+/).filter(Boolean)) {
    count(report.origins, origin);
  }
}

function getRejectionReason(rawWord) {
  if (!rawWord) {
    return "empty";
  }
  if (!/^[\p{Letter}]+$/u.test(rawWord)) {
    return "non-letter-form";
  }

  const word = normalizeWord(rawWord);

  if (!word) {
    return "empty-after-normalization";
  }
  if (word.length < MIN_LENGTH) {
    return "too-short";
  }
  if (word.length > MAX_LENGTH) {
    return "too-long";
  }

  return null;
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
