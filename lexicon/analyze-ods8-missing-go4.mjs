import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SERENIMOT_DICTIONARY_PATH = process.argv[2] ?? "public/static/dictionary/lexique383.txt";
const ODS8_REFERENCE_PATH = process.argv[3] ?? "lexicon/sources/ods8.txt";
const MORPHALOU_REFERENCE_PATH = process.argv[4] ?? "lexicon/generated/morphalou-forms.txt";
const LEFFF_REFERENCE_PATH = process.argv[5] ?? "lexicon/generated/lefff-forms.txt";
const LEFFF_METADATA_PATH = process.argv[6] ?? "lexicon/generated/lefff-metadata.json";
const REPORT_PATH = process.argv[7] ?? "lexicon/generated/ods8-go4-missing-report.json";
const REVIEW_PATH = process.argv[8] ?? "lexicon/generated/ods8-go4-missing-review.tsv";
const MAX_PLAYABLE_LENGTH = 13;
const SAMPLE_LIMIT = 160;
const STRONG_VERB_SUFFIXES = [
  "ERAIENT",
  "ERIONS",
  "ERIEZ",
  "ERAIS",
  "ERAIT",
  "ERENT",
  "EREZ",
  "ERONS",
  "ERONT",
  "ASSENT",
  "ASSIEZ",
  "ASSIONS",
  "ASSES",
  "ASSE",
  "AIENT"
];
const AMBIGUOUS_VERB_SUFFIXES = [
  "AIS",
  "AIT",
  "IEZ",
  "IONS",
  "ONS",
  "EZ"
];
const DERIVED_NOUN_SUFFIXES = [
  "ABILITES",
  "ATIONS",
  "EMENTS",
  "ISATIONS",
  "ISMES",
  "ISTES",
  "EURS",
  "EUSES",
  "ATRICES",
  "ATEURS",
  "MENT",
  "MENTS"
];
const ADJECTIVE_SUFFIXES = [
  "ABLES",
  "IQUES",
  "EENNES",
  "IENNES",
  "AISES",
  "OISES",
  "ANTES",
  "ANTS",
  "EES",
  "EUX",
  "EUSE",
  "IVE",
  "IVES"
];

const serenimotWords = parseWordList(await readFile(SERENIMOT_DICTIONARY_PATH, "utf8"));
const ods8Words = parseWordList(await readFile(ODS8_REFERENCE_PATH, "utf8"));
const morphalouWords = parseWordList(await readFile(MORPHALOU_REFERENCE_PATH, "utf8"));
const lefffWords = parseWordList(await readFile(LEFFF_REFERENCE_PATH, "utf8"));
const lefffMetadata = JSON.parse(await readFile(LEFFF_METADATA_PATH, "utf8"));
const missingWords = [...ods8Words].filter((word) => !serenimotWords.has(word)).sort((first, second) => first.localeCompare(second));
const rows = ["word\tlength\tinMorphalou\tinLefff\tlefffCategories\tfamilies\tprimaryFamily"];
const report = {
  generatedAt: new Date().toISOString(),
  mode: "ods8-missing-go4",
  note: "Cartographie des mots ODS 8 encore absents de Sérénimot. Ce rapport ne modifie pas le dictionnaire.",
  inputs: {
    serenimot: SERENIMOT_DICTIONARY_PATH,
    ods8: ODS8_REFERENCE_PATH,
    morphalou: MORPHALOU_REFERENCE_PATH,
    lefff: LEFFF_REFERENCE_PATH,
    lefffMetadata: LEFFF_METADATA_PATH
  },
  outputs: {
    report: REPORT_PATH,
    review: REVIEW_PATH
  },
  counts: {
    missing: missingWords.length,
    playableLength: 0,
    overBoardLimit: 0,
    inMorphalou: 0,
    inLefff: 0,
    inBothOpen: 0,
    inNeitherOpen: 0
  },
  byLength: {},
  byPrimaryFamily: {},
  byFamily: {},
  suffixFamilies: {},
  samples: {}
};

for (const word of missingWords) {
  const inMorphalou = morphalouWords.has(word);
  const inLefff = lefffWords.has(word);
  const lefffCategories = Object.keys(lefffMetadata[word]?.c ?? {});
  const families = classifyFamilies(word, { inMorphalou, inLefff, lefffCategories });
  const primaryFamily = families[0] ?? "unclassified";

  if (word.length <= MAX_PLAYABLE_LENGTH) {
    report.counts.playableLength += 1;
  } else {
    report.counts.overBoardLimit += 1;
  }
  if (inMorphalou) {
    report.counts.inMorphalou += 1;
  }
  if (inLefff) {
    report.counts.inLefff += 1;
  }
  if (inMorphalou && inLefff) {
    report.counts.inBothOpen += 1;
  }
  if (!inMorphalou && !inLefff) {
    report.counts.inNeitherOpen += 1;
  }

  count(report.byLength, String(word.length));
  count(report.byPrimaryFamily, primaryFamily);
  for (const family of families) {
    count(report.byFamily, family);
    addSample(report.samples, family, word);
  }
  for (const suffix of getMatchedSuffixes(word)) {
    count(report.suffixFamilies, suffix);
  }

  rows.push([
    word,
    word.length,
    inMorphalou ? "yes" : "no",
    inLefff ? "yes" : "no",
    lefffCategories.join(","),
    families.join(","),
    primaryFamily
  ].join("\t"));
}

report.byLength = sortObject(report.byLength, numericKeySort);
report.byPrimaryFamily = sortObject(report.byPrimaryFamily);
report.byFamily = sortObject(report.byFamily);
report.suffixFamilies = sortObject(report.suffixFamilies);
report.samples = sortObject(report.samples);

await mkdir(path.dirname(REPORT_PATH), { recursive: true });
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(REVIEW_PATH, `${rows.join("\n")}\n`);

console.log(`Cartographie GO4 générée -> ${path.relative(process.cwd(), REPORT_PATH)}`);
console.log(`Mots ODS 8 encore absents : ${missingWords.length}`);
console.log(`Jouables en 13 lettres ou moins : ${report.counts.playableLength}`);
console.log(`Hors limite plateau : ${report.counts.overBoardLimit}`);

function classifyFamilies(word, context) {
  const families = [];

  if (word.length > MAX_PLAYABLE_LENGTH) {
    families.push("over-board-limit");
  }
  if (context.lefffCategories.includes("proper-noun")) {
    families.push("blocked-lefff-proper-noun");
  }
  if (context.lefffCategories.includes("non-lexical")) {
    families.push("blocked-lefff-non-lexical");
  }
  if (word.length <= 4) {
    families.push("short-word");
  }
  if (looksLikeVerbInflection(word)) {
    families.push("verb-inflection");
  }
  if (looksLikeAmbiguousVerbInflection(word)) {
    families.push("verb-suffix-ambiguous");
  }
  if (looksLikeDerivedNoun(word)) {
    families.push("derived-noun");
  }
  if (looksLikeAdjectiveOrParticiple(word)) {
    families.push("adjective-or-participle");
  }
  if (context.inMorphalou) {
    families.push("in-morphalou");
  }
  if (context.inLefff) {
    families.push("in-lefff");
  }
  if (!context.inMorphalou && !context.inLefff) {
    families.push("missing-open-reference");
  }

  if (families.length === 0) {
    families.push("unclassified");
  }

  return families;
}

function looksLikeVerbInflection(word) {
  return STRONG_VERB_SUFFIXES.some((suffix) => word.endsWith(suffix));
}

function looksLikeAmbiguousVerbInflection(word) {
  return AMBIGUOUS_VERB_SUFFIXES.some((suffix) => word.endsWith(suffix));
}

function looksLikeDerivedNoun(word) {
  return DERIVED_NOUN_SUFFIXES.some((suffix) => word.endsWith(suffix));
}

function looksLikeAdjectiveOrParticiple(word) {
  return ADJECTIVE_SUFFIXES.some((suffix) => word.endsWith(suffix));
}

function getMatchedSuffixes(word) {
  return [...STRONG_VERB_SUFFIXES, ...AMBIGUOUS_VERB_SUFFIXES, ...DERIVED_NOUN_SUFFIXES, ...ADJECTIVE_SUFFIXES]
    .filter((suffix) => word.endsWith(suffix))
    .sort((first, second) => second.length - first.length);
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
