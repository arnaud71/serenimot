import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SERENIMOT_DICTIONARY_PATH = process.argv[2] ?? "public/static/dictionary/lexique383.txt";
const LEFFF_REFERENCE_PATH = process.argv[3] ?? "lexicon/generated/lefff-forms.txt";
const MORPHALOU_REFERENCE_PATH = process.argv[4] ?? "lexicon/generated/morphalou-forms.txt";
const ODS8_REFERENCE_PATH = process.argv[5] ?? "lexicon/sources/ods8.txt";
const REPORT_PATH = process.argv[6] ?? "lexicon/generated/lefff-enrichment-report.json";
const CANDIDATES_PATH = process.argv[7] ?? "lexicon/generated/lefff-enrichment-candidates.tsv";
const LEFFF_METADATA_PATH = process.argv[8] ?? "lexicon/generated/lefff-metadata.json";
const SAMPLE_LIMIT = 200;

const serenimotWords = await readRequiredWordSet(SERENIMOT_DICTIONARY_PATH, "dictionnaire Sérénimot");
const lefffWords = await readRequiredWordSet(LEFFF_REFERENCE_PATH, "référence Lefff");
const morphalouWords = await readOptionalWordSet(MORPHALOU_REFERENCE_PATH);
const ods8Words = await readOptionalWordSet(ODS8_REFERENCE_PATH);
const lefffMetadata = await readOptionalJson(LEFFF_METADATA_PATH);

const lefffOnly = difference(lefffWords, serenimotWords);
const rows = ["word\tlength\tinOds8\tinMorphalou\tlefffCategories\tbucket"];
const report = {
  generatedAt: new Date().toISOString(),
  mode: "enrichment-analysis",
  note: "Analyse locale des formes Lefff absentes du dictionnaire Sérénimot. Aucun mot n'est intégré automatiquement.",
  inputs: {
    serenimot: SERENIMOT_DICTIONARY_PATH,
    lefff: LEFFF_REFERENCE_PATH,
    morphalou: morphalouWords ? MORPHALOU_REFERENCE_PATH : null,
    ods8: ods8Words ? ODS8_REFERENCE_PATH : null,
    lefffMetadata: lefffMetadata ? LEFFF_METADATA_PATH : null
  },
  outputs: {
    report: REPORT_PATH,
    candidates: CANDIDATES_PATH
  },
  counts: {
    serenimot: serenimotWords.size,
    lefff: lefffWords.size,
    lefffCommonWithSerenimot: intersectionCount(lefffWords, serenimotWords),
    lefffOnly: lefffOnly.length,
    lefffOnlyInOds8: 0,
    lefffOnlyInMorphalou: 0,
    lefffOnlyInOds8AndMorphalou: 0,
    ods8OnlyCoveredByLefff: null
  },
  byLength: {},
  buckets: {},
  samples: {}
};

if (ods8Words) {
  const ods8Only = difference(ods8Words, serenimotWords);
  report.counts.ods8OnlyCoveredByLefff = ods8Only.filter((word) => lefffWords.has(word)).length;
}

for (const word of lefffOnly) {
  const inOds8 = Boolean(ods8Words?.has(word));
  const inMorphalou = Boolean(morphalouWords?.has(word));
  const metadata = lefffMetadata?.[word] ?? null;
  const bucket = classifyCandidate(word, inOds8, inMorphalou, metadata);

  if (inOds8) {
    report.counts.lefffOnlyInOds8 += 1;
  }
  if (inMorphalou) {
    report.counts.lefffOnlyInMorphalou += 1;
  }
  if (inOds8 && inMorphalou) {
    report.counts.lefffOnlyInOds8AndMorphalou += 1;
  }

  count(report.byLength, String(word.length));
  count(report.buckets, bucket);
  addSample(report.samples, bucket, word);
  rows.push([
    word,
    word.length,
    inOds8 ? "yes" : "no",
    inMorphalou ? "yes" : "no",
    formatCategories(metadata),
    bucket
  ].join("\t"));
}

report.byLength = sortObject(report.byLength, numericKeySort);
report.buckets = sortObject(report.buckets);
report.samples = sortObject(report.samples);

await mkdir(path.dirname(REPORT_PATH), { recursive: true });
await mkdir(path.dirname(CANDIDATES_PATH), { recursive: true });
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(CANDIDATES_PATH, `${rows.join("\n")}\n`);

console.log(`Analyse Lefff générée -> ${path.relative(process.cwd(), REPORT_PATH)}`);
console.log(`Candidats Lefff -> ${path.relative(process.cwd(), CANDIDATES_PATH)}`);
console.log(`Formes Lefff absentes de Sérénimot : ${lefffOnly.length}`);

if (ods8Words) {
  console.log(`Parmi elles, confirmées par ODS 8 : ${report.counts.lefffOnlyInOds8}`);
  console.log(`Mots ODS 8 absents de Sérénimot couverts par Lefff : ${report.counts.ods8OnlyCoveredByLefff}`);
}

async function readRequiredWordSet(filePath, label) {
  try {
    return parseWordList(await readFile(filePath, "utf8"));
  } catch (error) {
    throw new Error(`Impossible de lire ${label} : ${filePath}`, { cause: error });
  }
}

async function readOptionalWordSet(filePath) {
  try {
    return parseWordList(await readFile(filePath, "utf8"));
  } catch {
    return null;
  }
}

async function readOptionalJson(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return null;
  }
}

function parseWordList(source) {
  const words = new Set();

  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const firstField = trimmed.split(/[\t,; ]+/)[0] ?? "";
    const word = normalizeWord(firstField);

    if (word) {
      words.add(word);
    }
  }

  return words;
}

function normalizeWord(word) {
  return word
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^A-Za-z]/g, "")
    .toUpperCase();
}

function difference(firstSet, secondSet) {
  return [...firstSet].filter((word) => !secondSet.has(word)).sort((first, second) => first.localeCompare(second));
}

function intersectionCount(firstSet, secondSet) {
  let total = 0;

  for (const word of firstSet) {
    if (secondSet.has(word)) {
      total += 1;
    }
  }

  return total;
}

function classifyCandidate(word, inOds8, inMorphalou, metadata) {
  if (hasCategory(metadata, "proper-noun")) {
    return "proper-noun-review";
  }
  if (hasCategory(metadata, "non-lexical")) {
    return "non-lexical-review";
  }
  if (inOds8 && inMorphalou) {
    return "high-confidence-cross-source";
  }
  if (inOds8) {
    return "ods8-confirmed";
  }
  if (inMorphalou) {
    return "morphalou-confirmed";
  }
  if (word.length <= 4) {
    return "short-manual-review";
  }

  return "lefff-only-review";
}

function hasCategory(metadata, category) {
  return Boolean(metadata?.c?.[category]);
}

function formatCategories(metadata) {
  if (!metadata) {
    return "";
  }

  return Object.keys(metadata.c).join(",");
}

function count(target, key) {
  target[key] = (target[key] ?? 0) + 1;
}

function addSample(target, key, word) {
  target[key] ??= [];

  if (target[key].length < SAMPLE_LIMIT) {
    target[key].push(word);
  }
}

function sortObject(object, sorter = (first, second) => first.localeCompare(second)) {
  return Object.fromEntries(Object.entries(object).sort(([first], [second]) => sorter(first, second)));
}

function numericKeySort(first, second) {
  return Number(first) - Number(second);
}
