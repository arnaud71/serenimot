import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SERENIMOT_DICTIONARY_PATH = process.argv[2] ?? "public/static/dictionary/lexique383.txt";
const REFERENCE_SOURCE_PATH = process.argv[3] ?? "lexicon/sources/ods8.txt";
const OUTPUT_PATH = process.argv[4] ?? "lexicon/generated/ods8-compatibility-report.json";
const REFERENCE_LABEL = process.argv[5] ?? "ODS 8";
const SAMPLE_LIMIT = 200;

let serenimotSource;
let referenceSource;

try {
  serenimotSource = await readFile(SERENIMOT_DICTIONARY_PATH, "utf8");
} catch (error) {
  throw new Error(`Dictionnaire Sérénimot introuvable : ${SERENIMOT_DICTIONARY_PATH}`, { cause: error });
}

try {
  referenceSource = await readFile(REFERENCE_SOURCE_PATH, "utf8");
} catch {
  console.error(`Source ${REFERENCE_LABEL} introuvable : ${REFERENCE_SOURCE_PATH}`);
  console.error("Place un fichier texte local légalement obtenu à cet emplacement.");
  console.error("Le fichier doit rester hors Git et contenir un mot par ligne, ou des lignes dont le premier champ est le mot.");
  process.exit(2);
}

const serenimotWords = parseWordList(serenimotSource);
const referenceWords = parseWordList(referenceSource);

const serenimotOnly = difference(serenimotWords, referenceWords);
const referenceOnly = difference(referenceWords, serenimotWords);
const common = intersection(serenimotWords, referenceWords);

const report = {
  generatedAt: new Date().toISOString(),
  mode: "compatibility-only",
  reference: REFERENCE_LABEL,
  note: `Ce rapport compare Sérénimot avec une source ${REFERENCE_LABEL} locale sans l'intégrer au dictionnaire du jeu.`,
  inputs: {
    serenimot: SERENIMOT_DICTIONARY_PATH,
    reference: REFERENCE_SOURCE_PATH
  },
  counts: {
    serenimot: serenimotWords.size,
    reference: referenceWords.size,
    common: common.length,
    serenimotOnly: serenimotOnly.length,
    referenceOnly: referenceOnly.length
  },
  ratios: {
    serenimotAcceptedByReference: ratio(common.length, serenimotWords.size),
    referenceCoveredBySerenimot: ratio(common.length, referenceWords.size)
  },
  samples: {
    serenimotOnly: serenimotOnly.slice(0, SAMPLE_LIMIT),
    referenceOnly: referenceOnly.slice(0, SAMPLE_LIMIT)
  },
  byLength: {
    serenimotOnly: countByLength(serenimotOnly),
    referenceOnly: countByLength(referenceOnly)
  }
};

await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
await writeFile(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`);

console.log(`Rapport ${REFERENCE_LABEL} généré -> ${path.relative(process.cwd(), OUTPUT_PATH)}`);
console.log(`Communs : ${common.length}`);
console.log(`Dans Sérénimot seulement : ${serenimotOnly.length}`);
console.log(`Dans ${REFERENCE_LABEL} seulement : ${referenceOnly.length}`);

function parseWordList(source) {
  const words = new Set();

  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const firstField = trimmed.split(/[\t,; ]+/)[0] ?? "";
    const normalizedWord = normalizeWord(firstField);

    if (normalizedWord.length > 0) {
      words.add(normalizedWord);
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

function intersection(firstSet, secondSet) {
  return [...firstSet].filter((word) => secondSet.has(word)).sort((first, second) => first.localeCompare(second));
}

function ratio(part, total) {
  return total === 0 ? 0 : Number((part / total).toFixed(4));
}

function countByLength(words) {
  const counts = {};

  for (const word of words) {
    counts[word.length] = (counts[word.length] ?? 0) + 1;
  }

  return Object.fromEntries(Object.entries(counts).sort(([first], [second]) => Number(first) - Number(second)));
}
