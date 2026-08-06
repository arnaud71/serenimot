import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const WORDS_PATH = process.argv[2] ?? "public/static/dictionary/lexique4005.txt";
const METADATA_PATH = process.argv[3] ?? "lexicon/generated/lexique400-preview-metadata.json";
const EXPLANATIONS_PATH =
  process.argv[4] ?? "lexicon/releases/4.00.5/serenimot-lexicon-4.00.5.explanations.json";
const REPORT_PATH = process.argv[5] ?? "lexicon/reviews/word-explanations-priority-report.json";
const TSV_PATH = process.argv[6] ?? "lexicon/reviews/word-explanations-priority.tsv";
const MAX_WORD_LENGTH = 8;
const MAX_REVIEW_ROWS = 500;

const LETTER_VALUES = new Map([
  ["A", 1],
  ["E", 1],
  ["I", 1],
  ["O", 1],
  ["U", 1],
  ["L", 2],
  ["M", 2],
  ["N", 2],
  ["R", 2],
  ["S", 2],
  ["T", 2],
  ["C", 3],
  ["D", 3],
  ["P", 3],
  ["B", 4],
  ["F", 4],
  ["G", 4],
  ["H", 5],
  ["J", 6],
  ["Q", 6],
  ["V", 5],
  ["W", 8],
  ["X", 8],
  ["Y", 8],
  ["Z", 8]
]);
const RARE_LETTERS = new Set(["H", "J", "Q", "V", "W", "X", "Y", "Z"]);

const words = (await readFile(WORDS_PATH, "utf8")).split(/\r?\n/).filter(Boolean);
const metadata = JSON.parse(await readFile(METADATA_PATH, "utf8"));
const explanations = JSON.parse(await readFile(EXPLANATIONS_PATH, "utf8"));
const explainedWords = new Set(explanations.entries.map((entry) => entry.word));
const candidates = words
  .filter((word) => word.length <= MAX_WORD_LENGTH)
  .filter((word) => /^[A-Z]+$/.test(word))
  .filter((word) => !explainedWords.has(word))
  .filter((word) => [...word].every((letter) => LETTER_VALUES.has(letter)))
  .map((word) => analyzeWord(word, metadata[word]))
  .sort(comparePriority);
const reviewRows = candidates.slice(0, MAX_REVIEW_ROWS);
const report = {
  generatedAt: new Date().toISOString(),
  mode: "word-explanation-priority",
  note: "File de priorite pour les prochaines fiches explicatives. Elle ne modifie pas le lexique jouable.",
  inputs: {
    words: WORDS_PATH,
    metadata: METADATA_PATH,
    explanations: EXPLANATIONS_PATH
  },
  outputs: {
    report: REPORT_PATH,
    review: TSV_PATH
  },
  rules: {
    maxWordLength: MAX_WORD_LENGTH,
    maxReviewRows: MAX_REVIEW_ROWS,
    excludesAlreadyExplainedWords: true,
    excludesWordsWithUnavailableTiles: true,
    priorityFactors: [
      "mots tres courts",
      "frequence Lexique",
      "valeur des lettres",
      "lettres rares",
      "mots appuyes par metadonnees ouvertes",
      "pluriels et formes utiles en croisement"
    ]
  },
  counts: {
    activeWords: words.length,
    explainedWords: explainedWords.size,
    eligibleWordsWithoutExplanation: candidates.length,
    exportedRows: reviewRows.length
  },
  byPriorityBand: summarizeByBand(candidates),
  byLength: summarizeByLength(candidates),
  topWords: reviewRows.slice(0, 50).map((row) => row.word)
};
const tsvRows = [
  "rank\tword\tpriorityScore\tpriorityBand\tlength\ttileValue\tfrequency\tcategories\tlemmas\ttags\treason",
  ...reviewRows.map((row, index) =>
    [
      index + 1,
      row.word,
      row.priorityScore,
      row.priorityBand,
      row.length,
      row.tileValue,
      row.frequency,
      row.categories.join(","),
      row.lemmas.join(","),
      row.tags.join(","),
      row.reason
    ].join("\t")
  )
];

await mkdir(path.dirname(REPORT_PATH), { recursive: true });
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(TSV_PATH, `${tsvRows.join("\n")}\n`);

console.log(`File de priorite : ${reviewRows.length} mots -> ${path.relative(process.cwd(), TSV_PATH)}`);
console.log(`Rapport : ${path.relative(process.cwd(), REPORT_PATH)}`);

function analyzeWord(word, meta = {}) {
  const length = word.length;
  const frequency = getMaxFrequency(meta);
  const tileValue = [...word].reduce((sum, letter) => sum + (LETTER_VALUES.get(letter) ?? 0), 0);
  const categories = sortedUnique(splitValues([...(meta.cr ?? []), ...(meta.co ?? []), ...(meta.c ?? [])]));
  const lemmas = sortedUnique(splitValues(meta.l ?? []));
  const tags = getTags(word, meta, frequency, tileValue, categories, lemmas);
  const priorityScore = getPriorityScore(length, frequency, tileValue, tags);

  return {
    word,
    priorityScore,
    priorityBand: getPriorityBand(priorityScore),
    length,
    tileValue,
    frequency: Number(frequency.toFixed(3)),
    categories,
    lemmas,
    tags,
    reason: getReason(tags)
  };
}

function getTags(word, meta, frequency, tileValue, categories, lemmas) {
  const tags = [];

  if (word.length <= 3) {
    tags.push("tres-court");
  } else if (word.length <= 5) {
    tags.push("court");
  }

  if (frequency >= 50) {
    tags.push("tres-frequent");
  } else if (frequency >= 10) {
    tags.push("frequent");
  } else if (frequency < 1) {
    tags.push("rare");
  }

  if (tileValue >= 14) {
    tags.push("forte-valeur");
  }

  if ([...word].some((letter) => RARE_LETTERS.has(letter))) {
    tags.push("lettre-rare");
  }

  if (lemmas.length > 0 || categories.length > 0) {
    tags.push("metadonnees-ouvertes");
  }

  if (meta.n?.includes("p") || (word.endsWith("S") && lemmas.length > 0)) {
    tags.push("pluriel-ou-forme-flechie");
  }

  if (word.length <= 4 && (frequency < 5 || tags.includes("lettre-rare"))) {
    tags.push("mot-surprenant");
  }

  return tags;
}

function getPriorityScore(length, frequency, tileValue, tags) {
  const lengthScore = length <= 2 ? 90 : length === 3 ? 78 : length === 4 ? 64 : length === 5 ? 50 : length === 6 ? 34 : length === 7 ? 20 : 12;
  const frequencyScore = Math.log10(frequency + 1) * 28;
  const tileScore = tileValue * 1.4;
  const metadataScore = tags.includes("metadonnees-ouvertes") ? 9 : 0;
  const rareLetterScore = tags.includes("lettre-rare") ? 10 : 0;
  const pluralPenalty = tags.includes("pluriel-ou-forme-flechie") ? -4 : 0;

  return Number((lengthScore + frequencyScore + tileScore + metadataScore + rareLetterScore + pluralPenalty).toFixed(2));
}

function getPriorityBand(score) {
  if (score >= 120) {
    return "A";
  }
  if (score >= 95) {
    return "B";
  }
  return "C";
}

function getReason(tags) {
  const reasons = [];

  if (tags.includes("tres-court") || tags.includes("court")) {
    reasons.push("utile en croisement");
  }
  if (tags.includes("tres-frequent") || tags.includes("frequent")) {
    reasons.push("mot courant");
  }
  if (tags.includes("lettre-rare") || tags.includes("forte-valeur")) {
    reasons.push("score potentiellement eleve");
  }
  if (tags.includes("mot-surprenant")) {
    reasons.push("peut surprendre le joueur");
  }
  if (tags.includes("metadonnees-ouvertes")) {
    reasons.push("appui lexical disponible");
  }

  return reasons.join("; ");
}

function comparePriority(first, second) {
  return (
    second.priorityScore - first.priorityScore ||
    first.length - second.length ||
    second.frequency - first.frequency ||
    first.word.localeCompare(second.word)
  );
}

function getMaxFrequency(meta) {
  const values = [meta.fq?.films, meta.fq?.books, meta.fq?.lemmaFilms, meta.fq?.lemmaBooks]
    .map((value) => Number(value ?? 0))
    .filter(Number.isFinite);

  return Math.max(0, ...values);
}

function summarizeByBand(rows) {
  return rows.reduce((summary, row) => {
    summary[row.priorityBand] = (summary[row.priorityBand] ?? 0) + 1;
    return summary;
  }, {});
}

function summarizeByLength(rows) {
  return rows.reduce((summary, row) => {
    summary[row.length] = (summary[row.length] ?? 0) + 1;
    return summary;
  }, {});
}

function sortedUnique(values) {
  return [...new Set(values.filter(Boolean))].sort((first, second) => first.localeCompare(second));
}

function splitValues(values) {
  return values.flatMap((value) =>
    String(value)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  );
}
