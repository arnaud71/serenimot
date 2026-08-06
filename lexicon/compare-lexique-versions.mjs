import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const OLD_SOURCE_PATH = process.argv[2] ?? "lexicon/sources/Lexique383.tsv";
const NEW_SOURCE_PATH = process.argv[3] ?? "lexicon/sources/Lexique400.tsv";
const OUTPUT_PATH = process.argv[4] ?? "lexicon/generated/lexique400-migration-report.json";
const OLD_LABEL = process.argv[5] ?? "Lexique 3.83";
const NEW_LABEL = process.argv[6] ?? "Lexique 4.00";
const REMOVED_REVIEW_PATH = process.argv[7] ?? OUTPUT_PATH.replace(/\.json$/u, "-removed-review.tsv");
const MIN_LENGTH = 2;
const MAX_LENGTH = 13;
const SAMPLE_LIMIT = 200;

const EXCLUDED_WORDS = new Set(["BD", "CD", "CM", "DIAM", "DM", "DVD", "FM", "KG", "KM", "M2", "M3", "MG", "ML", "MM", "SMS", "TV", "WC"]);

const COLUMN_ALIASES = {
  ortho: ["ortho", "1_Mot"],
  lemme: ["lemme", "4_Lemme"],
  cgram: ["cgram", "5_Cgram"],
  genre: ["genre", "7_Genre"],
  nombre: ["nombre", "8_Nombre"],
  freqfilms2: ["freqfilms2", "10_FreqMot"],
  freqlivres: ["freqlivres", "11_FreqOrtho"],
  islem: ["islem", "14_IsLem"],
  morphoder: ["morphoder", "31_MorphoStruct"]
};

const ALLOWED_GRAMMATICAL_CATEGORIES = new Set([
  "ADJ",
  "ADV",
  "ART",
  "AUX",
  "CON",
  "LIA",
  "NOM",
  "ONO",
  "PRE",
  "PRO",
  "VER"
]);

const oldLexique = parseLexique(await readSource(OLD_SOURCE_PATH, OLD_LABEL));
const newLexique = parseLexique(await readSource(NEW_SOURCE_PATH, NEW_LABEL));

const oldWords = new Set(oldLexique.acceptedWords);
const newWords = new Set(newLexique.acceptedWords);
const commonWords = intersection(oldWords, newWords);
const addedWords = difference(newWords, oldWords);
const removedWords = difference(oldWords, newWords);
const removedDiagnostics = removedWords.map((word) => diagnoseRemovedWord(word, oldLexique, newLexique, newWords));

const report = {
  generatedAt: new Date().toISOString(),
  mode: "lexique-version-migration-preview",
  note: "Comparaison locale entre deux versions de Lexique. Ce rapport ne modifie pas le dictionnaire jouable de Serenimot.",
  inputs: {
    old: {
      label: OLD_LABEL,
      path: OLD_SOURCE_PATH
    },
    new: {
      label: NEW_LABEL,
      path: NEW_SOURCE_PATH
    }
  },
  rules: {
    minLength: MIN_LENGTH,
    maxLength: MAX_LENGTH,
    allowedCategoryRoots: [...ALLOWED_GRAMMATICAL_CATEGORIES].sort(),
    manualExclusions: [...EXCLUDED_WORDS].sort()
  },
  counts: {
    oldSourceRows: oldLexique.sourceRows,
    newSourceRows: newLexique.sourceRows,
    oldAccepted: oldWords.size,
    newAccepted: newWords.size,
    common: commonWords.length,
    added: addedWords.length,
    removed: removedWords.length
  },
  ratios: {
    oldRetainedInNew: ratio(commonWords.length, oldWords.size),
    newAlreadyInOld: ratio(commonWords.length, newWords.size),
    growthFromOld: ratio(addedWords.length - removedWords.length, oldWords.size)
  },
  byLength: {
    added: countByLength(addedWords),
    removed: countByLength(removedWords)
  },
  byCategoryRoot: {
    oldAccepted: oldLexique.acceptedByCategoryRoot,
    newAccepted: newLexique.acceptedByCategoryRoot,
    added: countFromMetadata(addedWords, newLexique.metadata, "categoryRoots"),
    removed: countFromMetadata(removedWords, oldLexique.metadata, "categoryRoots")
  },
  removedDiagnostics: {
    byStatus: countByProperty(removedDiagnostics, "status"),
    byRecommendation: countByProperty(removedDiagnostics, "recommendation"),
    byNewRejectionReason: countByArrayProperty(removedDiagnostics, "newRejectionReasons"),
    byOldLemmaStatus: countByProperty(removedDiagnostics, "oldLemmaStatus"),
    keepCandidateCount: removedDiagnostics.filter((diagnostic) => diagnostic.recommendation === "review-keep-candidate").length
  },
  rejections: {
    old: oldLexique.rejectionsByReason,
    new: newLexique.rejectionsByReason
  },
  samples: {
    added: addedWords.slice(0, SAMPLE_LIMIT).map((word) => buildSample(word, newLexique.metadata.get(word))),
    removed: removedWords.slice(0, SAMPLE_LIMIT).map((word) => buildSample(word, oldLexique.metadata.get(word)))
  }
};

await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
await writeFile(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(REMOVED_REVIEW_PATH, `${formatRemovedReview(removedDiagnostics)}\n`);

console.log(`Rapport de migration ${OLD_LABEL} -> ${NEW_LABEL} généré -> ${path.relative(process.cwd(), OUTPUT_PATH)}`);
console.log(`Revue des retraits générée -> ${path.relative(process.cwd(), REMOVED_REVIEW_PATH)}`);
console.log(`${OLD_LABEL} accepté : ${oldWords.size}`);
console.log(`${NEW_LABEL} accepté : ${newWords.size}`);
console.log(`Communs : ${commonWords.length}`);
console.log(`Ajouts potentiels : ${addedWords.length}`);
console.log(`Retraits potentiels : ${removedWords.length}`);

async function readSource(sourcePath, label) {
  try {
    return await readFile(sourcePath, "utf8");
  } catch (error) {
    throw new Error(`Source ${label} introuvable : ${sourcePath}`, { cause: error });
  }
}

function parseLexique(source) {
  const [headerLine, ...lines] = source.split(/\r?\n/);
  const headers = headerLine.split("\t");
  const indexes = Object.fromEntries(headers.map((header, index) => [header, index]));

  for (const requiredColumn of ["ortho", "lemme", "cgram"]) {
    if (findColumnIndex(indexes, requiredColumn) === undefined) {
      throw new Error(`Le fichier Lexique doit contenir la colonne ${requiredColumn}.`);
    }
  }

  const acceptedWords = new Set();
  const metadata = new Map();
  const allMetadata = new Map();
  const rejectionsByReason = {};
  const acceptedByCategoryRoot = {};
  let sourceRows = 0;

  for (const [lineIndex, line] of lines.entries()) {
    if (!line.trim()) {
      continue;
    }

    sourceRows += 1;
    const row = parseRow(line.split("\t"), indexes, lineIndex + 2);
    const normalizedWord = normalizeWord(row.ortho);
    const normalizedLemma = normalizeWord(row.lemme);
    const categoryRoot = row.cgram.split(":")[0];
    const rejectionReason = getRejectionReason(row, normalizedWord, categoryRoot);

    if (normalizedWord) {
      addMetadata(allMetadata, normalizedWord, row, normalizedLemma, categoryRoot, rejectionReason);
    }

    if (rejectionReason) {
      count(rejectionsByReason, rejectionReason);
      continue;
    }

    acceptedWords.add(normalizedWord);
    count(acceptedByCategoryRoot, categoryRoot || "(vide)");
    addMetadata(metadata, normalizedWord, row, normalizedLemma, categoryRoot);
  }

  for (const excludedWord of EXCLUDED_WORDS) {
    acceptedWords.delete(excludedWord);
    metadata.delete(excludedWord);
  }

  return {
    sourceRows,
    acceptedWords: [...acceptedWords].sort((first, second) => first.localeCompare(second)),
    metadata,
    allMetadata,
    acceptedByCategoryRoot: sortCounts(acceptedByCategoryRoot),
    rejectionsByReason: sortCounts(rejectionsByReason)
  };
}

function parseRow(columns, indexes, line) {
  return {
    ortho: getColumn(columns, indexes, "ortho"),
    lemme: getColumn(columns, indexes, "lemme"),
    cgram: getColumn(columns, indexes, "cgram"),
    genre: getColumn(columns, indexes, "genre"),
    nombre: getColumn(columns, indexes, "nombre"),
    freqfilms2: getColumn(columns, indexes, "freqfilms2"),
    freqlivres: getColumn(columns, indexes, "freqlivres"),
    islem: getColumn(columns, indexes, "islem"),
    morphoder: getColumn(columns, indexes, "morphoder"),
    line
  };
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

function getRejectionReason(row, normalizedWord, categoryRoot) {
  if (!normalizedWord) {
    return "empty-after-normalization";
  }
  if (!ALLOWED_GRAMMATICAL_CATEGORIES.has(categoryRoot)) {
    return "category-not-allowed";
  }
  if (!/^[\p{Letter}]+$/u.test(row.ortho)) {
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

function addMetadata(metadata, word, row, normalizedLemma, categoryRoot, rejectionReason = "") {
  const entry = metadata.get(word) ?? {
    word,
    forms: new Set(),
    lemmas: new Set(),
    categories: new Set(),
    categoryRoots: new Set(),
    genders: new Set(),
    numbers: new Set(),
    lines: [],
    isLemma: false,
    maxFilmFrequency: null,
    maxBookFrequency: null,
    rejectionReasons: new Set()
  };

  entry.forms.add(row.ortho);
  if (normalizedLemma) {
    entry.lemmas.add(normalizedLemma);
  }
  addOptional(entry.categories, row.cgram);
  addOptional(entry.categoryRoots, categoryRoot);
  addOptional(entry.genders, row.genre);
  addOptional(entry.numbers, row.nombre);
  entry.lines.push(row.line);
  entry.isLemma = entry.isLemma || row.islem === "1";
  entry.maxFilmFrequency = maxNumber(entry.maxFilmFrequency, row.freqfilms2);
  entry.maxBookFrequency = maxNumber(entry.maxBookFrequency, row.freqlivres);
  addOptional(entry.rejectionReasons, rejectionReason);

  metadata.set(word, entry);
}

function buildSample(word, entry) {
  if (!entry) {
    return { word };
  }

  return {
    word,
    forms: sorted(entry.forms).slice(0, 4),
    lemmas: sorted(entry.lemmas).slice(0, 4),
    categories: sorted(entry.categories).slice(0, 4),
    categoryRoots: sorted(entry.categoryRoots),
    genders: sorted(entry.genders),
    numbers: sorted(entry.numbers),
    isLemma: entry.isLemma,
    maxFilmFrequency: entry.maxFilmFrequency,
    maxBookFrequency: entry.maxBookFrequency,
    firstLine: Math.min(...entry.lines)
  };
}

function diagnoseRemovedWord(word, oldLexique, newLexique, newWords) {
  const oldEntry = oldLexique.metadata.get(word);
  const newRawEntry = newLexique.allMetadata.get(word);
  const oldLemmas = sorted(oldEntry?.lemmas ?? new Set());
  const acceptedLemmasInNew = oldLemmas.filter((lemma) => newWords.has(lemma));
  const rawLemmasInNew = oldLemmas.filter((lemma) => newLexique.allMetadata.has(lemma));
  const oldLemmaStatus = acceptedLemmasInNew.length > 0 ? "lemma-accepted-in-new" : rawLemmasInNew.length > 0 ? "lemma-present-in-new-raw" : "lemma-not-found-in-new";
  const status = newRawEntry ? "present-in-new-but-filtered" : "absent-from-new-source";
  const newRejectionReasons = sorted(newRawEntry?.rejectionReasons ?? new Set());
  const oldCategoryRoots = sorted(oldEntry?.categoryRoots ?? new Set());
  const recommendation = getRemovedRecommendation(status, newRejectionReasons, oldLemmaStatus, oldEntry);

  return {
    word,
    status,
    recommendation,
    oldLemmaStatus,
    oldLemmas,
    acceptedLemmasInNew,
    rawLemmasInNew,
    oldCategoryRoots,
    oldCategories: sorted(oldEntry?.categories ?? new Set()),
    oldForms: sorted(oldEntry?.forms ?? new Set()).slice(0, 4),
    newRejectionReasons,
    newCategories: sorted(newRawEntry?.categories ?? new Set()),
    newCategoryRoots: sorted(newRawEntry?.categoryRoots ?? new Set()),
    oldMaxFilmFrequency: oldEntry?.maxFilmFrequency ?? null,
    oldMaxBookFrequency: oldEntry?.maxBookFrequency ?? null,
    oldIsLemma: oldEntry?.isLemma ?? false
  };
}

function getRemovedRecommendation(status, newRejectionReasons, oldLemmaStatus, oldEntry) {
  if (status === "present-in-new-but-filtered") {
    if (newRejectionReasons.includes("too-long") || newRejectionReasons.includes("too-short") || newRejectionReasons.includes("non-letter-form")) {
      return "keep-rejected-by-current-rules";
    }
    return "review-filter-change";
  }

  if (oldEntry?.isLemma || oldLemmaStatus === "lemma-accepted-in-new") {
    return "review-keep-candidate";
  }

  if ((oldEntry?.maxFilmFrequency ?? 0) > 0 || (oldEntry?.maxBookFrequency ?? 0) > 0) {
    return "review-usage-attested";
  }

  return "review-low-priority";
}

function formatRemovedReview(diagnostics) {
  const header = [
    "word",
    "status",
    "recommendation",
    "oldLemmaStatus",
    "oldLemmas",
    "acceptedLemmasInNew",
    "oldCategoryRoots",
    "oldCategories",
    "newRejectionReasons",
    "newCategories",
    "oldMaxFilmFrequency",
    "oldMaxBookFrequency",
    "oldIsLemma",
    "oldForms"
  ];
  const rows = diagnostics.map((diagnostic) =>
    [
      diagnostic.word,
      diagnostic.status,
      diagnostic.recommendation,
      diagnostic.oldLemmaStatus,
      diagnostic.oldLemmas.join("|"),
      diagnostic.acceptedLemmasInNew.join("|"),
      diagnostic.oldCategoryRoots.join("|"),
      diagnostic.oldCategories.join("|"),
      diagnostic.newRejectionReasons.join("|"),
      diagnostic.newCategories.join("|"),
      diagnostic.oldMaxFilmFrequency ?? "",
      diagnostic.oldMaxBookFrequency ?? "",
      diagnostic.oldIsLemma ? "1" : "0",
      diagnostic.oldForms.join("|")
    ].join("\t")
  );

  return [header.join("\t"), ...rows].join("\n");
}

function normalizeWord(word) {
  return word
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^A-Za-z]/g, "")
    .toUpperCase();
}

function addOptional(target, value) {
  if (value) {
    target.add(value);
  }
}

function maxNumber(previous, value) {
  const parsed = Number(String(value).replace(",", "."));
  if (!Number.isFinite(parsed)) {
    return previous;
  }
  return previous === null ? parsed : Math.max(previous, parsed);
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

  return sortCounts(counts, ([first], [second]) => Number(first) - Number(second));
}

function countByProperty(items, property) {
  const counts = {};

  for (const item of items) {
    count(counts, item[property] || "(vide)");
  }

  return sortCounts(counts);
}

function countByArrayProperty(items, property) {
  const counts = {};

  for (const item of items) {
    const values = item[property]?.length ? item[property] : ["(vide)"];

    for (const value of values) {
      count(counts, value || "(vide)");
    }
  }

  return sortCounts(counts);
}

function countFromMetadata(words, metadata, field) {
  const counts = {};

  for (const word of words) {
    const entry = metadata.get(word);
    const values = entry?.[field] ?? new Set(["(inconnu)"]);

    for (const value of values) {
      count(counts, value || "(vide)");
    }
  }

  return sortCounts(counts);
}

function count(target, key) {
  target[key] = (target[key] ?? 0) + 1;
}

function sorted(values) {
  return [...values].sort((first, second) => first.localeCompare(second));
}

function sortCounts(counts, sorter = ([first], [second]) => first.localeCompare(second)) {
  return Object.fromEntries(Object.entries(counts).sort(sorter));
}
