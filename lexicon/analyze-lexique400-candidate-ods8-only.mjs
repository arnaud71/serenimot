import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const CANDIDATE_PATH = process.argv[2] ?? "lexicon/generated/lexique400-candidate.txt";
const ODS8_PATH = process.argv[3] ?? "lexicon/sources/ods8.txt";
const CURRENT_DICTIONARY_PATH = process.argv[4] ?? "public/static/dictionary/lexique383.txt";
const LEXIQUE400_SOURCE_PATH = process.argv[5] ?? "lexicon/sources/Lexique400.tsv";
const CURRENT_METADATA_PATH = process.argv[6] ?? "lexicon/generated/lexique383-metadata.json";
const MORPHALOU_FORMS_PATH = process.argv[7] ?? "lexicon/generated/morphalou-forms.txt";
const LEFFF_METADATA_PATH = process.argv[8] ?? "lexicon/generated/lefff-metadata.json";
const REMOVED_REVIEW_PATH = process.argv[9] ?? "lexicon/generated/lexique400-migration-report-removed-review.tsv";
const REPORT_PATH = process.argv[10] ?? "lexicon/generated/lexique400-candidate-ods8-only-analysis.json";
const TSV_PATH = process.argv[11] ?? "lexicon/generated/lexique400-candidate-ods8-only-analysis.tsv";

const candidateWords = parseWordList(await readFile(CANDIDATE_PATH, "utf8"));
const ods8Words = parseWordList(await readFile(ODS8_PATH, "utf8"));
const currentWords = parseWordList(await readFile(CURRENT_DICTIONARY_PATH, "utf8"));
const lexique400Metadata = parseLexique400(await readFile(LEXIQUE400_SOURCE_PATH, "utf8"));
const currentMetadata = JSON.parse(await readFile(CURRENT_METADATA_PATH, "utf8"));
const morphalouWords = await readOptionalWordList(MORPHALOU_FORMS_PATH);
const lefffMetadata = await readOptionalJson(LEFFF_METADATA_PATH);
const removedReview = await readOptionalRemovedReview(REMOVED_REVIEW_PATH);

const candidates = [...candidateWords]
  .filter((word) => !ods8Words.has(word))
  .sort((first, second) => first.localeCompare(second))
  .map((word) => analyzeWord(word));

const report = {
  generatedAt: new Date().toISOString(),
  mode: "lexique400-candidate-ods8-only-analysis",
  note: "Analyse locale des mots du candidat 4.00.1-preview absents d'ODS 8. Ce rapport ne modifie pas le dictionnaire.",
  inputs: {
    candidate: CANDIDATE_PATH,
    ods8: ODS8_PATH,
    currentDictionary: CURRENT_DICTIONARY_PATH,
    lexique400: LEXIQUE400_SOURCE_PATH,
    currentMetadata: CURRENT_METADATA_PATH,
    morphalouForms: MORPHALOU_FORMS_PATH,
    lefffMetadata: LEFFF_METADATA_PATH,
    removedReview: REMOVED_REVIEW_PATH
  },
  outputs: {
    report: REPORT_PATH,
    tsv: TSV_PATH
  },
  counts: {
    candidate: candidateWords.size,
    ods8: ods8Words.size,
    candidateOnly: candidates.length
  },
  byOrigin: summarize(candidates, "primaryOrigin"),
  byDecision: summarize(candidates, "decision"),
  byLength: countByLength(candidates.map((candidate) => candidate.word)),
  byRiskTag: summarizeList(candidates, "riskTags"),
  bySourceTag: summarizeList(candidates, "sourceTags"),
  samples: {
    byDecision: sampleBy(candidates, "decision"),
    byOrigin: sampleBy(candidates, "primaryOrigin")
  }
};

const tsvRows = [
  "word\tdecision\tprimaryOrigin\tlength\tsourceTags\triskTags\tcategories\tlemmas\tcurrentSources\tcurrentFlags\tfrequency\tremovedRecommendation\tremovedStatus",
  ...candidates.map((candidate) =>
    [
      candidate.word,
      candidate.decision,
      candidate.primaryOrigin,
      candidate.length,
      candidate.sourceTags.join(","),
      candidate.riskTags.join(","),
      candidate.categories.join(","),
      candidate.lemmas.join(","),
      candidate.currentSources.join(","),
      candidate.currentFlags.join(","),
      candidate.frequency,
      candidate.removedRecommendation,
      candidate.removedStatus
    ].join("\t")
  )
];

await mkdir(path.dirname(REPORT_PATH), { recursive: true });
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(TSV_PATH, `${tsvRows.join("\n")}\n`);

console.log(`Analyse candidat hors ODS 8 -> ${path.relative(process.cwd(), REPORT_PATH)}`);
console.log(`Revue TSV -> ${path.relative(process.cwd(), TSV_PATH)}`);
console.log(`Mots analyses : ${candidates.length}`);
for (const [decision, summary] of Object.entries(report.byDecision)) {
  console.log(`${decision}: ${summary.count}`);
}

function analyzeWord(word) {
  const currentMeta = currentMetadata[word] ?? {};
  const lexique400Meta = lexique400Metadata.get(word);
  const lefffMeta = lefffMetadata[word];
  const removed = removedReview.get(word);
  const inCurrent = currentWords.has(word);
  const inLexique400 = Boolean(lexique400Meta);
  const inMorphalou = morphalouWords.has(word);
  const inLefff = Boolean(lefffMeta);
  const sourceTags = getSourceTags({ inCurrent, inLexique400, inMorphalou, inLefff, removed, currentMeta });
  const categories = unique([...(currentMeta.c ?? []), ...(lexique400Meta?.categories ?? []), ...Object.keys(lefffMeta?.c ?? {})]);
  const categoryRoots = unique([...(currentMeta.cr ?? []), ...(lexique400Meta?.categoryRoots ?? [])]);
  const lemmas = unique([...(currentMeta.l ?? []), ...(lexique400Meta?.lemmas ?? [])]);
  const currentSources = currentMeta.s ?? [];
  const currentFlags = currentMeta.fl ?? [];
  const frequency = getMaxFrequency(currentMeta, lexique400Meta);
  const riskTags = getRiskTags(word, {
    categories,
    categoryRoots,
    currentFlags,
    frequency,
    inMorphalou,
    inLefff,
    lefffMeta,
    removed
  });
  const primaryOrigin = getPrimaryOrigin({ inLexique400, inCurrent, removed, currentSources, currentFlags, currentMeta });
  const decision = getDecision({ sourceTags, riskTags, currentFlags, removed, primaryOrigin });

  return {
    word,
    length: word.length,
    decision,
    primaryOrigin,
    sourceTags,
    riskTags,
    categories,
    categoryRoots,
    lemmas,
    currentSources,
    currentFlags,
    frequency,
    removedRecommendation: removed?.recommendation ?? "",
    removedStatus: removed?.status ?? ""
  };
}

function getSourceTags({ inCurrent, inLexique400, inMorphalou, inLefff, removed, currentMeta }) {
  const tags = [];
  tags.push(inLexique400 ? "in-lexique400" : "not-in-lexique400");
  tags.push(inCurrent ? "in-current-serenimot" : "new-via-lexique400");
  tags.push(inMorphalou ? "in-morphalou" : "not-in-morphalou");
  tags.push(inLefff ? "in-lefff" : "not-in-lefff");
  if (removed) {
    tags.push("retained-from-383-review");
  }
  for (const source of currentMeta.s ?? []) {
    tags.push(`current-source:${source}`);
  }
  return tags;
}

function getRiskTags(word, context) {
  const tags = [];
  const categorySet = new Set(context.categories);
  const rootSet = new Set(context.categoryRoots);
  const flagSet = new Set(context.currentFlags);

  if (word.length <= 4) {
    tags.push("short-word");
  }
  if (!context.inMorphalou && !context.inLefff) {
    tags.push("absent-open-cross-sources");
  }
  if (flagSet.has("likely-abbreviation")) {
    tags.push("likely-abbreviation");
  }
  if (context.lefffMeta?.c?.["proper-noun"]) {
    tags.push("lefff-proper-noun");
  }
  if (!context.inMorphalou && looksLikeProperNoun(word, categorySet)) {
    tags.push("proper-noun-likely");
  }
  if (rootSet.has("ONO") || categorySet.has("ONO")) {
    tags.push("onomatopoeia-or-interjection");
  }
  if (hasFunctionFragment(categorySet)) {
    tags.push("function-fragment");
  }
  if (context.frequency < 0.1) {
    tags.push("very-low-frequency");
  } else if (context.frequency < 1) {
    tags.push("low-frequency");
  }
  if (context.removed?.recommendation === "review-usage-attested") {
    tags.push("usage-attested-in-383");
  }
  if (context.removed?.recommendation === "review-keep-candidate") {
    tags.push("keep-candidate-from-383-review");
  }
  return tags;
}

function getPrimaryOrigin({ inLexique400, inCurrent, removed, currentSources, currentFlags, currentMeta }) {
  if (inLexique400 && !inCurrent) {
    return "lexique400-new";
  }
  if (removed) {
    return "retained-from-383-review";
  }
  if (currentSources.includes("lexique383")) {
    return "current-lexique383-or-enriched";
  }
  if ((currentMeta.c?.length ?? 0) > 0 || (currentMeta.l?.length ?? 0) > 0) {
    return "current-lexical-metadata";
  }
  if (currentFlags.includes("derived-form")) {
    return "current-derived-form";
  }
  if (currentFlags.includes("lefff-cross-source-confirmed")) {
    return "current-lefff-cross-source";
  }
  if (currentFlags.includes("morphalou-ods8-filtered")) {
    return "current-morphalou-ods8-filtered";
  }
  if (currentFlags.includes("rule-generated-ods8-filtered")) {
    return "current-rule-generated-ods8-filtered";
  }
  if (currentSources.length > 0) {
    return `current-${currentSources[0]}`;
  }
  return "current-unknown";
}

function getDecision({ riskTags, currentFlags, removed, primaryOrigin }) {
  const risks = new Set(riskTags);
  const flags = new Set(currentFlags);

  if (flags.has("ods8-confirmed-derived") || flags.has("ods8-confirmed-imperative")) {
    return "keep-ods-confirmed-existing";
  }
  if (risks.has("likely-abbreviation") || risks.has("lefff-proper-noun") || risks.has("function-fragment")) {
    return "review-exclusion-high";
  }
  if (risks.has("short-word") && risks.has("absent-open-cross-sources")) {
    return "review-exclusion-high";
  }
  if (risks.has("proper-noun-likely") && risks.has("absent-open-cross-sources")) {
    return "review-exclusion-medium";
  }
  if (primaryOrigin === "lexique400-new" && risks.has("absent-open-cross-sources")) {
    return "review-new-lexique400";
  }
  if (removed?.recommendation === "review-keep-candidate") {
    return "keep-review-later";
  }
  if (removed?.recommendation === "review-usage-attested") {
    return "keep-usage-attested-review";
  }
  if (risks.has("very-low-frequency")) {
    return "review-low-frequency";
  }
  return "keep-review-later";
}

function parseLexique400(source) {
  const [headerLine, ...lines] = source.split(/\r?\n/);
  const indexes = Object.fromEntries(headerLine.split("\t").map((header, index) => [header, index]));
  const metadata = new Map();

  for (const line of lines) {
    if (!line.trim()) {
      continue;
    }

    const columns = line.split("\t");
    const word = normalizeWord(getColumn(columns, indexes, ["1_Mot", "ortho"]));
    const lemma = normalizeWord(getColumn(columns, indexes, ["4_Lemme", "lemme"]));
    const category = getColumn(columns, indexes, ["5_Cgram", "cgram"]);
    if (!word) {
      continue;
    }
    const entry = metadata.get(word) ?? {
      categories: new Set(),
      categoryRoots: new Set(),
      lemmas: new Set(),
      frequency: 0
    };
    addOptional(entry.categories, category);
    addOptional(entry.categoryRoots, category.split(":")[0]);
    addOptional(entry.lemmas, lemma);
    entry.frequency = Math.max(entry.frequency, toNumber(getColumn(columns, indexes, ["10_FreqMot", "freqfilms2"])));
    metadata.set(word, entry);
  }

  return new Map(
    [...metadata.entries()].map(([word, entry]) => [
      word,
      {
        categories: sorted(entry.categories),
        categoryRoots: sorted(entry.categoryRoots),
        lemmas: sorted(entry.lemmas),
        frequency: entry.frequency
      }
    ])
  );
}

function parseWordList(source) {
  return new Set(
    source
      .split(/\r?\n/)
      .map((line) => normalizeWord(line.trim().split(/[\t,; ]+/)[0] ?? ""))
      .filter(Boolean)
  );
}

async function readOptionalWordList(sourcePath) {
  try {
    return parseWordList(await readFile(sourcePath, "utf8"));
  } catch {
    return new Set();
  }
}

async function readOptionalJson(sourcePath) {
  try {
    return JSON.parse(await readFile(sourcePath, "utf8"));
  } catch {
    return {};
  }
}

async function readOptionalRemovedReview(sourcePath) {
  try {
    const [headerLine, ...lines] = (await readFile(sourcePath, "utf8")).trim().split(/\r?\n/);
    const headers = headerLine.split("\t");
    const indexes = Object.fromEntries(headers.map((header, index) => [header, index]));
    return new Map(
      lines
        .filter((line) => line.trim())
        .map((line) => {
          const columns = line.split("\t");
          return [
            columns[indexes.word] ?? "",
            {
              status: columns[indexes.status] ?? "",
              recommendation: columns[indexes.recommendation] ?? ""
            }
          ];
        })
        .filter(([word]) => word)
    );
  } catch {
    return new Map();
  }
}

function normalizeWord(word) {
  return word
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^A-Za-z]/g, "")
    .toUpperCase();
}

function getColumn(columns, indexes, names) {
  for (const name of names) {
    if (indexes[name] !== undefined) {
      return (columns[indexes[name]] ?? "").trim();
    }
  }
  return "";
}

function getMaxFrequency(currentMeta, lexique400Meta) {
  const frequency = currentMeta.fq ?? {};
  return Math.max(
    Number(frequency.films ?? 0),
    Number(frequency.books ?? 0),
    Number(frequency.lemmaFilms ?? 0),
    Number(frequency.lemmaBooks ?? 0),
    Number(lexique400Meta?.frequency ?? 0)
  );
}

function hasFunctionFragment(categorySet) {
  return (
    categorySet.has("CON") ||
    categorySet.has("PRE") ||
    categorySet.has("PRO:per") ||
    categorySet.has("PRO:int") ||
    categorySet.has("PRO:rel") ||
    categorySet.has("ART:ind")
  );
}

function looksLikeProperNoun(word, categorySet) {
  const properSuffixes = ["AIN", "AINE", "AIS", "AISE", "AND", "ANDE", "EEN", "EENNE", "IEN", "IENNE", "OIS", "OISE"];
  return categorySet.has("NOM") && word.length >= 5 && properSuffixes.some((suffix) => word.endsWith(suffix));
}

function summarize(entries, property) {
  const summary = {};
  for (const entry of entries) {
    const key = entry[property] || "(vide)";
    summary[key] ??= { count: 0, examples: [] };
    summary[key].count += 1;
    if (summary[key].examples.length < 80) {
      summary[key].examples.push(entry.word);
    }
  }
  return sortSummary(summary);
}

function summarizeList(entries, property) {
  const summary = {};
  for (const entry of entries) {
    const values = entry[property].length ? entry[property] : ["(vide)"];
    for (const key of values) {
      summary[key] ??= { count: 0, examples: [] };
      summary[key].count += 1;
      if (summary[key].examples.length < 80) {
        summary[key].examples.push(entry.word);
      }
    }
  }
  return sortSummary(summary);
}

function sampleBy(entries, property) {
  const samples = {};
  for (const entry of entries) {
    const key = entry[property] || "(vide)";
    samples[key] ??= [];
    if (samples[key].length < 120) {
      samples[key].push(entry.word);
    }
  }
  return samples;
}

function countByLength(words) {
  const counts = {};
  for (const word of words) {
    counts[word.length] = (counts[word.length] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([first], [second]) => Number(first) - Number(second)));
}

function sortSummary(summary) {
  return Object.fromEntries(Object.entries(summary).sort(([, first], [, second]) => second.count - first.count));
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort((first, second) => first.localeCompare(second));
}

function sorted(values) {
  return [...values].sort((first, second) => first.localeCompare(second));
}

function addOptional(target, value) {
  if (value) {
    target.add(value);
  }
}

function toNumber(value) {
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}
