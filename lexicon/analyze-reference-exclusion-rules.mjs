import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SERENIMOT_DICTIONARY_PATH = process.argv[2] ?? "public/static/dictionary/lexique383.txt";
const REFERENCE_SOURCE_PATH = process.argv[3] ?? "lexicon/sources/ods8.txt";
const METADATA_PATH = process.argv[4] ?? "lexicon/generated/lexique383-metadata.json";
const OUTPUT_PATH = process.argv[5] ?? "lexicon/generated/ods8-exclusion-candidates.json";
const TSV_OUTPUT_PATH = process.argv[6] ?? "lexicon/generated/ods8-exclusion-candidates.tsv";
const REFERENCE_LABEL = process.argv[7] ?? "ODS 8";
const MORPHALOU_REFERENCE_PATH = process.argv[8] ?? "lexicon/generated/morphalou-forms.txt";

const serenimotWords = parseWordList(await readFile(SERENIMOT_DICTIONARY_PATH, "utf8"));
const referenceWords = parseWordList(await readFile(REFERENCE_SOURCE_PATH, "utf8"));
const metadata = JSON.parse(await readFile(METADATA_PATH, "utf8"));
const morphalouWords = await readOptionalWordList(MORPHALOU_REFERENCE_PATH);
const candidates = [...serenimotWords]
  .filter((word) => !referenceWords.has(word))
  .sort((first, second) => first.localeCompare(second))
  .map((word) => {
    const meta = metadata[word] ?? {};
    const frequency = getMaxFrequency(meta);
    const tags = getCandidateTags(word, meta, frequency, morphalouWords);
    const decision = getCandidateDecision(tags, meta);

    return {
      word,
      length: word.length,
      tags,
      decision,
      categories: meta.c ?? [],
      categoryRoots: meta.cr ?? [],
      lemmas: meta.l ?? [],
      flags: meta.fl ?? [],
      sources: meta.s ?? [],
      frequency
    };
  });

const report = {
  generatedAt: new Date().toISOString(),
  reference: REFERENCE_LABEL,
  note: "Analyse locale des mots Sérénimot absents de la référence. Ce rapport propose des règles candidates, il ne modifie pas le dictionnaire.",
  inputs: {
    serenimot: SERENIMOT_DICTIONARY_PATH,
    reference: REFERENCE_SOURCE_PATH,
    metadata: METADATA_PATH,
    morphalouReference: MORPHALOU_REFERENCE_PATH
  },
  counts: {
    candidates: candidates.length
  },
  ruleCandidates: summarizeRules(candidates),
  decisions: summarizeDecisions(candidates),
  samples: Object.fromEntries(
    Object.entries(groupByPrimaryTag(candidates)).map(([tag, words]) => [tag, words.slice(0, 80).map((entry) => entry.word)])
  ),
  decisionSamples: Object.fromEntries(
    Object.entries(groupByDecision(candidates)).map(([decision, words]) => [
      decision,
      words.slice(0, 80).map((entry) => entry.word)
    ])
  )
};

const tsvRows = [
  "word\tdecision\tlength\ttags\tflags\tcategories\tlemmas\tfrequency",
  ...candidates.map((candidate) =>
    [
      candidate.word,
      candidate.decision,
      candidate.length,
      candidate.tags.join(","),
      candidate.flags.join(","),
      candidate.categories.join(","),
      candidate.lemmas.join(","),
      candidate.frequency
    ].join("\t")
  )
];

await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
await writeFile(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(TSV_OUTPUT_PATH, `${tsvRows.join("\n")}\n`);

console.log(`Analyse des exclusions ${REFERENCE_LABEL} -> ${path.relative(process.cwd(), OUTPUT_PATH)}`);
for (const [rule, summary] of Object.entries(report.ruleCandidates)) {
  console.log(`${rule}: ${summary.count}`);
}

function parseWordList(source) {
  return new Set(
    source
      .split(/\r?\n/)
      .map((line) => normalizeWord(line.trim().split(/[\t,; ]+/)[0] ?? ""))
      .filter(Boolean)
  );
}

function normalizeWord(word) {
  return word
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^A-Za-z]/g, "")
    .toUpperCase();
}

async function readOptionalWordList(sourcePath) {
  try {
    return parseWordList(await readFile(sourcePath, "utf8"));
  } catch {
    return new Set();
  }
}

function getCandidateTags(word, meta, frequency, morphalouReferenceWords) {
  const tags = ["not-in-reference"];
  const roots = new Set(meta.cr ?? []);
  const flags = new Set(meta.fl ?? []);

  if (morphalouReferenceWords.has(word)) {
    tags.push("in-morphalou");
  } else {
    tags.push("not-in-morphalou");
  }
  if (flags.has("derived-form")) {
    tags.push("derived-form");
  }
  if (flags.has("ods8-confirmed-derived")) {
    tags.push("ods8-confirmed-derived");
  }
  if (flags.has("ods8-confirmed-imperative")) {
    tags.push("ods8-confirmed-imperative");
  }
  if (word.length <= 4) {
    tags.push("short-word");
  }
  if (flags.has("likely-abbreviation")) {
    tags.push("likely-abbreviation");
  }
  if (roots.has("ONO")) {
    tags.push("onomatopoeia-or-interjection");
  }
  if (roots.has("VER")) {
    tags.push("verb-form");
  }
  if (roots.has("NOM")) {
    tags.push("noun");
  }
  if (roots.has("ADJ")) {
    tags.push("adjective");
  }
  if (frequency < 0.1) {
    tags.push("very-low-frequency");
  } else if (frequency < 1) {
    tags.push("low-frequency");
  }
  if (word.length <= 4 && frequency < 1) {
    tags.push("short-low-frequency");
  }

  return tags;
}

function getCandidateDecision(tags) {
  const tagSet = new Set(tags);

  if (tagSet.has("ods8-confirmed-derived") || tagSet.has("ods8-confirmed-imperative")) {
    return "keep-technical-cross-form";
  }
  if (tagSet.has("likely-abbreviation")) {
    return "exclude";
  }
  if (tagSet.has("short-word") && !tagSet.has("in-morphalou")) {
    return "exclude";
  }
  if (tagSet.has("onomatopoeia-or-interjection") && !tagSet.has("in-morphalou")) {
    return "exclude";
  }
  if (tagSet.has("short-low-frequency")) {
    return "review-high-priority";
  }
  if (tagSet.has("not-in-morphalou")) {
    return "review-high-priority";
  }
  if (tagSet.has("very-low-frequency")) {
    return "review";
  }
  if (tagSet.has("derived-form")) {
    return "keep-derived";
  }
  return "review";
}

function getMaxFrequency(meta) {
  const frequency = meta.fq ?? {};
  return Math.max(
    Number(frequency.films ?? 0),
    Number(frequency.books ?? 0),
    Number(frequency.lemmaFilms ?? 0),
    Number(frequency.lemmaBooks ?? 0)
  );
}

function summarizeRules(candidates) {
  const rules = {};
  for (const candidate of candidates) {
    for (const tag of candidate.tags) {
      rules[tag] ??= { count: 0, examples: [] };
      rules[tag].count += 1;
      if (rules[tag].examples.length < 40) {
        rules[tag].examples.push(candidate.word);
      }
    }
  }
  return Object.fromEntries(Object.entries(rules).sort(([, first], [, second]) => second.count - first.count));
}

function summarizeDecisions(candidates) {
  const decisions = {};

  for (const candidate of candidates) {
    decisions[candidate.decision] ??= { count: 0, examples: [] };
    decisions[candidate.decision].count += 1;
    if (decisions[candidate.decision].examples.length < 60) {
      decisions[candidate.decision].examples.push(candidate.word);
    }
  }

  return Object.fromEntries(Object.entries(decisions).sort(([, first], [, second]) => second.count - first.count));
}

function groupByPrimaryTag(candidates) {
  const groups = {};
  for (const candidate of candidates) {
    const primaryTag = candidate.tags.find((tag) => tag !== "not-in-reference") ?? "not-in-reference";
    groups[primaryTag] ??= [];
    groups[primaryTag].push(candidate);
  }
  return groups;
}

function groupByDecision(candidates) {
  const groups = {};

  for (const candidate of candidates) {
    groups[candidate.decision] ??= [];
    groups[candidate.decision].push(candidate);
  }

  return groups;
}
