import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SERENIMOT_DICTIONARY_PATH = process.argv[2] ?? "public/static/dictionary/lexique383.txt";
const ODS8_REFERENCE_PATH = process.argv[3] ?? "lexicon/sources/ods8.txt";
const MORPHALOU_REFERENCE_PATH = process.argv[4] ?? "lexicon/generated/morphalou-forms.txt";
const LEFFF_REFERENCE_PATH = process.argv[5] ?? "lexicon/generated/lefff-forms.txt";
const LEFFF_METADATA_PATH = process.argv[6] ?? "lexicon/generated/lefff-metadata.json";
const REPORT_PATH = process.argv[7] ?? "lexicon/generated/ods8-go3-open-enrichment-report.json";
const REVIEW_PATH = process.argv[8] ?? "lexicon/generated/ods8-go3-open-enrichment.tsv";
const ACCEPTED_PATH = process.argv[9] ?? "lexicon/generated/ods8-go3-morphalou-confirmed-accepted.txt";

const serenimotWords = parseWordList(await readFile(SERENIMOT_DICTIONARY_PATH, "utf8"));
const ods8Words = parseWordList(await readFile(ODS8_REFERENCE_PATH, "utf8"));
const morphalouWords = parseWordList(await readFile(MORPHALOU_REFERENCE_PATH, "utf8"));
const lefffWords = parseWordList(await readFile(LEFFF_REFERENCE_PATH, "utf8"));
const lefffMetadata = JSON.parse(await readFile(LEFFF_METADATA_PATH, "utf8"));
const ods8Only = [...ods8Words].filter((word) => !serenimotWords.has(word)).sort((first, second) => first.localeCompare(second));
const rows = ["word\tlength\tinMorphalou\tinLefff\tlefffCategories\tbucket"];
const accepted = new Set();
const report = {
  generatedAt: new Date().toISOString(),
  mode: "ods8-open-enrichment-go3",
  note: "Analyse des mots ODS 8 absents de Sérénimot. Les candidats acceptés proviennent de Morphalou, avec ODS 8 comme filtre local de compatibilité.",
  inputs: {
    serenimot: SERENIMOT_DICTIONARY_PATH,
    ods8: ODS8_REFERENCE_PATH,
    morphalou: MORPHALOU_REFERENCE_PATH,
    lefff: LEFFF_REFERENCE_PATH,
    lefffMetadata: LEFFF_METADATA_PATH
  },
  outputs: {
    report: REPORT_PATH,
    review: REVIEW_PATH,
    accepted: ACCEPTED_PATH
  },
  counts: {
    ods8Only: ods8Only.length,
    accepted: 0
  },
  buckets: {},
  byLength: {},
  samples: {}
};

for (const word of ods8Only) {
  const inMorphalou = morphalouWords.has(word);
  const inLefff = lefffWords.has(word);
  const lefffCategories = Object.keys(lefffMetadata[word]?.c ?? {});
  const bucket = classifyCandidate({ inMorphalou, inLefff, lefffCategories });

  if (bucket === "morphalou-ods8-confirmed") {
    accepted.add(word);
    count(report.byLength, String(word.length));
  }

  count(report.buckets, bucket);
  addSample(report.samples, bucket, word);
  rows.push([
    word,
    word.length,
    inMorphalou ? "yes" : "no",
    inLefff ? "yes" : "no",
    lefffCategories.join(","),
    bucket
  ].join("\t"));
}

const acceptedWords = [...accepted].sort((first, second) => first.localeCompare(second));
report.counts.accepted = acceptedWords.length;
report.buckets = sortObject(report.buckets);
report.byLength = sortObject(report.byLength, numericKeySort);
report.samples = sortObject(report.samples);

await mkdir(path.dirname(REPORT_PATH), { recursive: true });
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(REVIEW_PATH, `${rows.join("\n")}\n`);
await writeFile(ACCEPTED_PATH, `${acceptedWords.join("\n")}\n`);

console.log(`Analyse GO3 générée -> ${path.relative(process.cwd(), REPORT_PATH)}`);
console.log(`Candidats Morphalou confirmés ODS 8 : ${acceptedWords.length} -> ${path.relative(process.cwd(), ACCEPTED_PATH)}`);

function classifyCandidate(candidate) {
  if (candidate.lefffCategories.includes("proper-noun")) {
    return "blocked-lefff-proper-noun";
  }
  if (candidate.lefffCategories.includes("non-lexical")) {
    return "blocked-lefff-non-lexical";
  }
  if (candidate.inMorphalou) {
    return "morphalou-ods8-confirmed";
  }
  if (candidate.inLefff) {
    return "lefff-only-review";
  }
  return "missing-open-reference";
}

function parseWordList(source) {
  const words = new Set();

  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const word = normalizeWord(trimmed.split(/[\t,; ]+/)[0] ?? "");

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

function count(target, key) {
  target[key] = (target[key] ?? 0) + 1;
}

function addSample(target, key, word) {
  target[key] ??= [];

  if (target[key].length < 200) {
    target[key].push(word);
  }
}

function sortObject(object, sorter = (first, second) => first.localeCompare(second)) {
  return Object.fromEntries(Object.entries(object).sort(([first], [second]) => sorter(first, second)));
}

function numericKeySort(first, second) {
  return Number(first) - Number(second);
}
