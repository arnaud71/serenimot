import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const LEXIQUE400_SOURCE_PATH = process.argv[2] ?? "lexicon/sources/Lexique400.tsv";
const CURRENT_DICTIONARY_PATH = process.argv[3] ?? "public/static/dictionary/lexique383.txt";
const REMOVED_REVIEW_PATH = process.argv[4] ?? "lexicon/generated/lexique400-migration-report-removed-review.tsv";
const OUTPUT_PATH = process.argv[5] ?? "lexicon/generated/lexique400-candidate.txt";
const REPORT_PATH = process.argv[6] ?? "lexicon/generated/lexique400-candidate-report.json";
const MIN_LENGTH = 2;
const MAX_LENGTH = 13;

const EXCLUDED_WORDS = new Set(["BD", "CD", "CM", "DIAM", "DM", "DVD", "FM", "KG", "KM", "M2", "M3", "MG", "ML", "MM", "SMS", "TV", "WC"]);
const ALLOWED_GRAMMATICAL_CATEGORIES = new Set(["ADJ", "ADV", "ART", "AUX", "CON", "LIA", "NOM", "ONO", "PRE", "PRO", "VER"]);
const COLUMN_ALIASES = {
  ortho: ["ortho", "1_Mot"],
  lemme: ["lemme", "4_Lemme"],
  cgram: ["cgram", "5_Cgram"]
};

const lexique400 = parseLexique(await readFile(LEXIQUE400_SOURCE_PATH, "utf8"));
const currentDictionary = parseWordList(await readFile(CURRENT_DICTIONARY_PATH, "utf8"));
const removedReview = await readRemovedReview(REMOVED_REVIEW_PATH);

const candidateWords = new Set([...lexique400.words, ...currentDictionary.words]);
for (const excludedWord of EXCLUDED_WORDS) {
  candidateWords.delete(excludedWord);
}

const sortedCandidateWords = [...candidateWords].sort((first, second) => first.localeCompare(second));
const currentOnly = difference(currentDictionary.words, lexique400.words);
const lexique400Only = difference(lexique400.words, currentDictionary.words);
const common = intersection(currentDictionary.words, lexique400.words);
const retainedRemovedReviewWords = currentOnly.filter((word) => removedReview.has(word));
const currentOnlyOutsideRemovedReview = currentOnly.filter((word) => !removedReview.has(word));

const report = {
  generatedAt: new Date().toISOString(),
  mode: "lexique400-candidate-preview",
  candidateVersion: "4.00.1-preview",
  note: "Candidat local non active dans le jeu. Il combine Lexique 4.00 filtre avec le dictionnaire Serenimot courant pour eviter toute perte avant revue.",
  inputs: {
    lexique400: LEXIQUE400_SOURCE_PATH,
    currentDictionary: CURRENT_DICTIONARY_PATH,
    removedReview: REMOVED_REVIEW_PATH
  },
  outputs: {
    candidate: OUTPUT_PATH,
    report: REPORT_PATH
  },
  rules: {
    minLength: MIN_LENGTH,
    maxLength: MAX_LENGTH,
    allowedCategoryRoots: [...ALLOWED_GRAMMATICAL_CATEGORIES].sort(),
    manualExclusions: [...EXCLUDED_WORDS].sort()
  },
  counts: {
    lexique400Accepted: lexique400.words.size,
    currentDictionary: currentDictionary.words.size,
    common,
    addedFromLexique400: lexique400Only.length,
    retainedFromCurrentDictionary: currentOnly.length,
    retainedFromRemovedReview: retainedRemovedReviewWords.length,
    retainedCurrentEnrichmentsOrOtherSources: currentOnlyOutsideRemovedReview.length,
    candidate: sortedCandidateWords.length
  },
  byLength: {
    candidate: countByLength(sortedCandidateWords),
    addedFromLexique400: countByLength(lexique400Only),
    retainedFromCurrentDictionary: countByLength(currentOnly)
  },
  retainedRemovedReview: summarizeRemovedReview(retainedRemovedReviewWords, removedReview),
  lexique400Rejections: lexique400.rejectionsByReason,
  samples: {
    addedFromLexique400: lexique400Only.slice(0, 200),
    retainedFromCurrentDictionary: currentOnly.slice(0, 200),
    retainedCurrentEnrichmentsOrOtherSources: currentOnlyOutsideRemovedReview.slice(0, 200)
  }
};

await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
await mkdir(path.dirname(REPORT_PATH), { recursive: true });
await writeFile(OUTPUT_PATH, `${sortedCandidateWords.join("\n")}\n`);
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

console.log(`Candidat Lexique Serenimot 4.00.1 genere -> ${path.relative(process.cwd(), OUTPUT_PATH)}`);
console.log(`Rapport candidat -> ${path.relative(process.cwd(), REPORT_PATH)}`);
console.log(`Mots candidat : ${sortedCandidateWords.length}`);
console.log(`Ajouts Lexique 4.00 : ${lexique400Only.length}`);
console.log(`Conserves depuis le dictionnaire courant : ${currentOnly.length}`);

function parseLexique(source) {
  const [headerLine, ...lines] = source.split(/\r?\n/);
  const indexes = Object.fromEntries(headerLine.split("\t").map((header, index) => [header, index]));
  const words = new Set();
  const rejectionsByReason = {};

  for (const requiredColumn of ["ortho", "cgram"]) {
    if (findColumnIndex(indexes, requiredColumn) === undefined) {
      throw new Error(`Le fichier Lexique doit contenir la colonne ${requiredColumn}.`);
    }
  }

  for (const line of lines) {
    if (!line.trim()) {
      continue;
    }

    const columns = line.split("\t");
    const ortho = getColumn(columns, indexes, "ortho");
    const cgram = getColumn(columns, indexes, "cgram");
    const normalizedWord = normalizeWord(ortho);
    const categoryRoot = cgram.split(":")[0];
    const rejectionReason = getRejectionReason(ortho, normalizedWord, categoryRoot);

    if (rejectionReason) {
      count(rejectionsByReason, rejectionReason);
      continue;
    }

    words.add(normalizedWord);
  }

  for (const excludedWord of EXCLUDED_WORDS) {
    words.delete(excludedWord);
  }

  return {
    words,
    rejectionsByReason: sortCounts(rejectionsByReason)
  };
}

function parseWordList(source) {
  const words = new Set();

  for (const line of source.split(/\r?\n/)) {
    const normalizedWord = normalizeWord(line.trim());
    if (normalizedWord) {
      words.add(normalizedWord);
    }
  }

  return { words };
}

async function readRemovedReview(sourcePath) {
  try {
    const source = await readFile(sourcePath, "utf8");
    return parseRemovedReview(source);
  } catch {
    return new Map();
  }
}

function parseRemovedReview(source) {
  const [headerLine, ...lines] = source.trim().split(/\r?\n/);
  const headers = headerLine.split("\t");
  const indexes = Object.fromEntries(headers.map((header, index) => [header, index]));
  const review = new Map();

  for (const line of lines) {
    if (!line.trim()) {
      continue;
    }

    const columns = line.split("\t");
    const word = columns[indexes.word] ?? "";
    if (!word) {
      continue;
    }

    review.set(word, {
      status: columns[indexes.status] ?? "",
      recommendation: columns[indexes.recommendation] ?? "",
      oldLemmaStatus: columns[indexes.oldLemmaStatus] ?? "",
      oldCategoryRoots: columns[indexes.oldCategoryRoots] ?? ""
    });
  }

  return review;
}

function summarizeRemovedReview(words, review) {
  const byRecommendation = {};
  const byStatus = {};
  const byOldLemmaStatus = {};
  const byOldCategoryRoot = {};

  for (const word of words) {
    const entry = review.get(word);
    if (!entry) {
      continue;
    }

    count(byRecommendation, entry.recommendation || "(vide)");
    count(byStatus, entry.status || "(vide)");
    count(byOldLemmaStatus, entry.oldLemmaStatus || "(vide)");
    for (const categoryRoot of entry.oldCategoryRoots.split("|").filter(Boolean)) {
      count(byOldCategoryRoot, categoryRoot);
    }
  }

  return {
    byRecommendation: sortCounts(byRecommendation),
    byStatus: sortCounts(byStatus),
    byOldLemmaStatus: sortCounts(byOldLemmaStatus),
    byOldCategoryRoot: sortCounts(byOldCategoryRoot)
  };
}

function getRejectionReason(ortho, normalizedWord, categoryRoot) {
  if (!normalizedWord) {
    return "empty-after-normalization";
  }
  if (!ALLOWED_GRAMMATICAL_CATEGORIES.has(categoryRoot)) {
    return "category-not-allowed";
  }
  if (!/^[\p{Letter}]+$/u.test(ortho)) {
    return "non-letter-form";
  }
  if (normalizedWord.length < MIN_LENGTH) {
    return "too-short";
  }
  if (normalizedWord.length > MAX_LENGTH) {
    return "too-long";
  }
  if (EXCLUDED_WORDS.has(normalizedWord)) {
    return "manual-exclusion";
  }
  return null;
}

function getColumn(columns, indexes, name) {
  const index = findColumnIndex(indexes, name);
  return index === undefined ? "" : (columns[index] ?? "").trim();
}

function findColumnIndex(indexes, name) {
  for (const candidate of COLUMN_ALIASES[name] ?? [name]) {
    if (indexes[candidate] !== undefined) {
      return indexes[candidate];
    }
  }
  return undefined;
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
  return [...firstSet].filter((word) => secondSet.has(word)).length;
}

function countByLength(words) {
  const counts = {};
  for (const word of words) {
    count(counts, String(word.length));
  }
  return sortCounts(counts, ([first], [second]) => Number(first) - Number(second));
}

function count(target, key) {
  target[key] = (target[key] ?? 0) + 1;
}

function sortCounts(counts, sorter = ([first], [second]) => first.localeCompare(second)) {
  return Object.fromEntries(Object.entries(counts).sort(sorter));
}
