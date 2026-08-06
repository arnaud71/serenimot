import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const TARGET_LENGTH = Number(process.argv[2] ?? 4);
const WORDS_PATH = process.argv[3] ?? "public/static/dictionary/lexique4005.txt";
const METADATA_PATH = process.argv[4] ?? "lexicon/generated/lexique400-preview-metadata.json";
const EXISTING_EXPLANATIONS_PATH =
  process.argv[5] ?? "lexicon/releases/4.00.5/serenimot-lexicon-4.00.5.explanations.json";
const WIKTIONARY_DEFINITIONS_PATH = process.argv[6] ?? "lexicon/generated/wiktionary-definitions.json";
const OUTPUT_PATH =
  process.argv[7] ?? `lexicon/generated/generated-${TARGET_LENGTH}-letter-word-explanations.json`;
const REPORT_PATH =
  process.argv[8] ?? `lexicon/generated/${TARGET_LENGTH}-letter-word-explanations-report.json`;

if (!Number.isInteger(TARGET_LENGTH) || TARGET_LENGTH < 2) {
  throw new Error(`Longueur de mot invalide : ${process.argv[2]}`);
}

const words = (await readFile(WORDS_PATH, "utf8"))
  .split(/\r?\n/)
  .filter((word) => word.length === TARGET_LENGTH);
const metadata = JSON.parse(await readFile(METADATA_PATH, "utf8"));
const existingExplanations = JSON.parse(await readFile(EXISTING_EXPLANATIONS_PATH, "utf8"));
const wiktionaryDefinitions = await readJsonIfExists(WIKTIONARY_DEFINITIONS_PATH, { entries: {} });
const alreadyExplained = new Set(
  existingExplanations.entries.filter((entry) => entry.reviewed !== false).map((entry) => entry.word)
);
const generatedWords = words.filter((word) => !alreadyExplained.has(word));
const generatedEntries = generatedWords.map((word) =>
  buildExplanation(word, metadata[word] ?? {}, wiktionaryDefinitions.entries?.[word])
);
const payload = {
  entries: generatedEntries
};

const report = {
  generatedAt: new Date().toISOString(),
  mode: `${TARGET_LENGTH}-letter-word-explanations`,
  note: "Fiches courtes generees depuis les metadonnees Lexique et le cache Wiktionnaire local. Les fiches revues manuellement restent prioritaires.",
  inputs: {
    words: WORDS_PATH,
    metadata: METADATA_PATH,
    existingExplanations: EXISTING_EXPLANATIONS_PATH,
    wiktionaryDefinitions: WIKTIONARY_DEFINITIONS_PATH
  },
  outputs: {
    generatedExplanations: OUTPUT_PATH,
    report: REPORT_PATH
  },
  counts: {
    targetLength: TARGET_LENGTH,
    targetWords: words.length,
    alreadyExplainedWords: words.length - generatedWords.length,
    generatedExplanations: generatedEntries.length,
    generatedWithWiktionaryDefinition: generatedEntries.filter((entry) =>
      entry.sources.some((source) => source.name === "Wiktionnaire")
    ).length,
    coveredWords: words.length
  }
};

await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
await mkdir(path.dirname(REPORT_PATH), { recursive: true });
await writeFile(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`);
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

console.log(`Generated ${generatedEntries.length} ${TARGET_LENGTH}-letter explanations -> ${OUTPUT_PATH}`);
console.log(`Report -> ${REPORT_PATH}`);

function buildExplanation(word, meta, wiktionaryDefinition) {
  const categories = normalizeCategories([...(meta.cr ?? []), ...(meta.c ?? []), ...(meta.co ?? [])]);
  const lemmas = uniqueStrings(meta.l ?? []);
  const normalizedLemma = getUsefulLemma(word, lemmas);
  const partOfSpeech = formatPartOfSpeech(categories, meta);
  const hasWiktionaryDefinition = Boolean(wiktionaryDefinition?.definition);
  const baseDefinition = hasWiktionaryDefinition
    ? normalizeExternalDefinition(wiktionaryDefinition.definition)
    : formatDefinition(word, categories, normalizedLemma);
  const definition = enrichDerivedDefinition(baseDefinition, wiktionaryDefinitions.entries ?? {});

  return omitEmpty({
    word,
    partOfSpeech,
    shortDefinition: definition,
    lemma: normalizedLemma ? normalizedLemma.toLocaleLowerCase("fr-CH") : undefined,
    sources: hasWiktionaryDefinition
      ? [
          { name: "Lexique", version: "4.00" },
          { name: "Wiktionnaire", version: "dump local" }
        ]
      : [{ name: "Lexique", version: "4.00" }],
    reviewed: false
  });
}

function normalizeCategories(values) {
  const categories = values
    .flatMap((value) => String(value).split(","))
    .map((value) => value.split(":")[0])
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean);

  return uniqueStrings(categories);
}

function normalizeExternalDefinition(definition) {
  const cleaned = definition
    .replace(/\s+\./gu, ".")
    .replace(/(?:\.\s*){2,}/gu, ". ")
    .replace(/\s*\([^)]*classification[^)]*\)/giu, "")
    .replace(/\s+/gu, " ")
    .trim();
  const mainMeaning = cleaned.split(". ")[0] ?? cleaned;
  const compact = compactLongDefinition(mainMeaning);

  if (compact.endsWith(".")) {
    return compact;
  }

  return `${compact}.`;
}

function compactLongDefinition(definition) {
  const maxLength = TARGET_LENGTH <= 4 ? 95 : 120;
  const cleaned = definition.trim();

  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  for (const separator of [" ; ", "; ", ", ", " : ", ": "]) {
    const boundary = cleaned.lastIndexOf(separator, maxLength);

    if (boundary >= 18) {
      return cleaned.slice(0, boundary).trim();
    }
  }

  for (const separator of [" qui ", " dont ", " utilisé ", " utilisée ", " composant ", " composée ", " composé "]) {
    const boundary = cleaned.indexOf(separator);

    if (boundary >= 45 && boundary <= maxLength) {
      return cleaned.slice(0, boundary).trim();
    }
  }

  const boundary = cleaned.lastIndexOf(" ", maxLength);
  return `${cleaned.slice(0, boundary >= 45 ? boundary : maxLength).trimEnd()}...`;
}

function enrichDerivedDefinition(definition, wiktionaryEntries) {
  const baseWord = getDerivedBaseWord(definition);

  if (!baseWord) {
    return definition;
  }

  const baseEntry = wiktionaryEntries[baseWord];

  if (!baseEntry?.definition || !isSameWiktionaryPage(baseEntry, baseWord)) {
    return definition;
  }

  const baseDefinition = normalizeExternalDefinition(baseEntry.definition);

  if (!baseDefinition || definition.includes(baseDefinition)) {
    return definition;
  }

  return `${definition} ${baseWord} : ${baseDefinition}`;
}

function getDerivedBaseWord(definition) {
  const verbMatch = definition.match(/\bdu verbe ([\p{L}'’-]+)\.?/iu);

  if (verbMatch?.[1]) {
    return normalizeLookupWord(verbMatch[1]);
  }

  const pluralMatch = definition.match(/^Pluriel de ([\p{L}'’-]+)\.?/iu);

  if (pluralMatch?.[1]) {
    return normalizeLookupWord(pluralMatch[1]);
  }

  return null;
}

function isSameWiktionaryPage(entry, expectedWord) {
  if (!entry.sourceUrl) {
    return true;
  }

  const rawPageName = entry.sourceUrl.split("/wiki/")[1] ?? "";
  const pageName = decodeURIComponent(rawPageName.replace(/_/gu, " "));

  return !pageName.includes(" ") && normalizeLookupWord(pageName) === expectedWord;
}

function normalizeLookupWord(word) {
  return word
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^A-Za-z]/gu, "")
    .toLocaleUpperCase("fr-CH");
}

function formatPartOfSpeech(categories, meta) {
  const labels = [];

  if (categories.includes("NOM")) {
    labels.push(formatNounLabel(meta));
  }
  if (categories.includes("VER") || categories.includes("AUX")) {
    labels.push("verbe");
  }
  if (categories.includes("ADJ")) {
    labels.push("adjectif");
  }
  if (categories.includes("ADV")) {
    labels.push("adverbe");
  }
  if (categories.includes("PRO")) {
    labels.push("pronom");
  }
  if (categories.includes("ART")) {
    labels.push("article");
  }
  if (categories.includes("CON")) {
    labels.push("conjonction");
  }
  if (categories.includes("PRE")) {
    labels.push("préposition");
  }
  if (categories.includes("ONO")) {
    labels.push("interjection");
  }

  return uniqueStrings(labels).join(" ou ") || "mot lexicalisé";
}

function formatNounLabel(meta) {
  const genders = meta.g ?? [];
  const numbers = meta.n ?? [];
  const genderLabel =
    genders.includes("f") && !genders.includes("m")
      ? " féminin"
      : genders.includes("m") && !genders.includes("f")
        ? " masculin"
        : "";
  const numberLabel = numbers.includes("p") && !numbers.includes("s") ? " pluriel" : "";

  return `nom${genderLabel}${numberLabel}`;
}

function formatDefinition(word, categories, lemma) {
  if ((categories.includes("VER") || categories.includes("AUX")) && lemma && lemma !== word) {
    return `Forme du verbe ${lemma.toLocaleLowerCase("fr-CH")}.`;
  }

  if (categories.includes("ONO")) {
    return "Interjection ou bruit lexicalisé.";
  }

  if (categories.includes("ART")) {
    return "Mot grammatical employé comme article.";
  }

  if (categories.includes("PRO")) {
    return "Mot grammatical employé comme pronom.";
  }

  if (categories.includes("PRE")) {
    return "Mot grammatical employé comme préposition.";
  }

  if (categories.includes("CON")) {
    return "Mot grammatical employé comme conjonction.";
  }

  if (categories.includes("ADV")) {
    return "Mot grammatical employé comme adverbe.";
  }

  if (categories.includes("ADJ")) {
    return "Adjectif lexicalisé.";
  }

  if (categories.includes("NOM")) {
    return "Nom lexicalisé.";
  }

  return "Mot lexicalisé dans le lexique actif.";
}

function getUsefulLemma(word, lemmas) {
  const lemma = lemmas.find((candidate) => candidate && candidate !== word) ?? lemmas[0];

  return lemma || undefined;
}

function uniqueStrings(values) {
  return [...new Set(values.filter(Boolean))].sort((first, second) => first.localeCompare(second));
}

function omitEmpty(entry) {
  return Object.fromEntries(Object.entries(entry).filter(([, value]) => value !== undefined && value !== ""));
}

async function readJsonIfExists(filePath, fallback) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}
