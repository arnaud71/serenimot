import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const positionalArgs = process.argv.slice(2).filter((argument) => !argument.startsWith("--"));
const flags = new Set(process.argv.slice(2).filter((argument) => argument.startsWith("--")));
const DICTIONARY_PATH = positionalArgs[0] ?? "public/static/dictionary/lexique383.txt";
const METADATA_PATH = positionalArgs[1] ?? "lexicon/generated/lexique383-metadata.json";
const GO4_REVIEW_PATH = positionalArgs[2] ?? "lexicon/generated/ods8-go4-missing-review.tsv";
const REPORT_PATH = positionalArgs[3] ?? "lexicon/generated/ods8-go5-rule-generation-report.json";
const REVIEW_PATH = positionalArgs[4] ?? "lexicon/generated/ods8-go5-rule-generation-review.tsv";
const ACCEPTED_PATH = positionalArgs[5] ?? "lexicon/generated/ods8-go5-rule-generated-accepted.txt";
const MAX_PLAYABLE_LENGTH = 13;
const ALLOW_INFERRED_ER_LEMMAS = flags.has("--allow-inferred-er-lemmas");
const RULES = [
  { name: "er-present-1s3s-imperative", suffix: "E", lemmaEnding: "ER" },
  { name: "er-present-2s", suffix: "ES", lemmaEnding: "ER" },
  { name: "er-present-3p", suffix: "ENT", lemmaEnding: "ER" },
  { name: "er-imperfect-1s2s", suffix: "AIS", lemmaEnding: "ER" },
  { name: "er-imperfect-3s", suffix: "AIT", lemmaEnding: "ER" },
  { name: "er-imperfect-1p", suffix: "IONS", lemmaEnding: "ER" },
  { name: "er-imperfect-2p", suffix: "IEZ", lemmaEnding: "ER" },
  { name: "er-imperfect-3p", suffix: "AIENT", lemmaEnding: "ER" },
  { name: "er-present-participle", suffix: "ANT", lemmaEnding: "ER" },
  { name: "er-past-participle-ms", suffix: "E", lemmaEnding: "ER" },
  { name: "er-past-participle-fs", suffix: "EE", lemmaEnding: "ER" },
  { name: "er-past-participle-mp", suffix: "ES", lemmaEnding: "ER" },
  { name: "er-past-participle-fp", suffix: "EES", lemmaEnding: "ER" },
  { name: "er-future-conditional-3p", suffix: "ERAIENT", lemmaEnding: "ER" },
  { name: "er-conditional-1p", suffix: "ERIONS", lemmaEnding: "ER" },
  { name: "er-conditional-2p", suffix: "ERIEZ", lemmaEnding: "ER" },
  { name: "er-conditional-1s2s", suffix: "ERAIS", lemmaEnding: "ER" },
  { name: "er-conditional-3s", suffix: "ERAIT", lemmaEnding: "ER" },
  { name: "er-past-simple-3p", suffix: "ERENT", lemmaEnding: "ER" },
  { name: "er-future-2p", suffix: "EREZ", lemmaEnding: "ER" },
  { name: "er-future-1p", suffix: "ERONS", lemmaEnding: "ER" },
  { name: "er-future-3p", suffix: "ERONT", lemmaEnding: "ER" },
  { name: "er-subj-imperfect-3p", suffix: "ASSENT", lemmaEnding: "ER" },
  { name: "er-subj-imperfect-2p", suffix: "ASSIEZ", lemmaEnding: "ER" },
  { name: "er-subj-imperfect-1p", suffix: "ASSIONS", lemmaEnding: "ER" },
  { name: "er-subj-imperfect-2s", suffix: "ASSES", lemmaEnding: "ER" },
  { name: "er-subj-imperfect-1s3s", suffix: "ASSE", lemmaEnding: "ER" }
];

const dictionaryWords = parseWordList(await readFile(DICTIONARY_PATH, "utf8"));
const metadata = JSON.parse(await readFile(METADATA_PATH, "utf8"));
const rows = parseRows(await readFile(GO4_REVIEW_PATH, "utf8"));
const playableMissingRows = rows.filter((row) => row.length <= MAX_PLAYABLE_LENGTH);
const analyzedRows = playableMissingRows.map((row) => {
  const ruleMatches = getRuleMatches(row.word);
  const acceptedMatches = ruleMatches.filter((match) => isKnownVerbLemma(match.lemma));
  const decision = getDecision(row, acceptedMatches);

  return {
    ...row,
    decision,
    ruleMatches,
    acceptedMatches
  };
});
const acceptedWords = analyzedRows
  .filter((row) => row.decision === "accept-rule-generated")
  .map((row) => row.word)
  .sort((first, second) => first.localeCompare(second));
const report = {
  generatedAt: new Date().toISOString(),
  mode: "rule-generation-go5",
  note: "Analyse des mots jouables ODS 8 absents de Sérénimot pouvant être générés par règles depuis des lemmes déjà acceptés. ODS 8 sert uniquement de filtre local de compatibilité.",
  inputs: {
    dictionary: DICTIONARY_PATH,
    metadata: METADATA_PATH,
    go4Review: GO4_REVIEW_PATH
  },
  outputs: {
    report: REPORT_PATH,
    review: REVIEW_PATH,
    accepted: ACCEPTED_PATH
  },
  rules: {
    maxPlayableLength: MAX_PLAYABLE_LENGTH,
    allowInferredErLemmas: ALLOW_INFERRED_ER_LEMMAS,
    generatedFamilies: ["regular-er-verb"]
  },
  counts: {
    playableMissing: playableMissingRows.length,
    accepted: acceptedWords.length,
    review: analyzedRows.filter((row) => row.decision === "review").length,
    rejected: analyzedRows.filter((row) => row.decision === "not-generated").length
  },
  acceptedByRule: summarizeAcceptedRules(analyzedRows),
  decisions: summarizeDecisions(analyzedRows),
  samples: {
    accepted: acceptedWords.slice(0, 200),
    review: analyzedRows
      .filter((row) => row.decision === "review")
      .slice(0, 200)
      .map((row) => row.word),
    notGenerated: analyzedRows
      .filter((row) => row.decision === "not-generated")
      .slice(0, 200)
      .map((row) => row.word)
  }
};
const tsvRows = [
  "word\tdecision\tlength\tprimaryFamily\tfamilies\tacceptedRules\tacceptedLemmas\tacceptedMatches\tcandidateLemmas",
  ...analyzedRows.map((row) =>
    [
      row.word,
      row.decision,
      row.length,
      row.primaryFamily,
      row.families.join(","),
      row.acceptedMatches.map((match) => match.rule).join(","),
      row.acceptedMatches.map((match) => match.lemma).join(","),
      row.acceptedMatches.map((match) => `${match.rule}:${match.lemma}`).join(","),
      row.ruleMatches.map((match) => `${match.rule}:${match.lemma}`).join(",")
    ].join("\t")
  )
];

await mkdir(path.dirname(REPORT_PATH), { recursive: true });
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(REVIEW_PATH, `${tsvRows.join("\n")}\n`);
await writeFile(ACCEPTED_PATH, `${acceptedWords.join("\n")}\n`);

console.log(`Analyse GO5 générée -> ${path.relative(process.cwd(), REPORT_PATH)}`);
console.log(`Formes générables acceptées : ${acceptedWords.length} -> ${path.relative(process.cwd(), ACCEPTED_PATH)}`);

function parseRows(source) {
  const [headerLine, ...lines] = source.split(/\r?\n/);
  const headers = headerLine.split("\t");

  return lines
    .filter((line) => line.trim())
    .map((line) => {
      const columns = line.split("\t");
      const row = Object.fromEntries(headers.map((header, index) => [header, columns[index] ?? ""]));
      return {
        word: row.word,
        length: Number(row.length),
        families: splitList(row.families),
        primaryFamily: row.primaryFamily
      };
    });
}

function splitList(value) {
  return value ? value.split(",").filter(Boolean) : [];
}

function getRuleMatches(word) {
  const matches = [];

  for (const rule of RULES) {
    if (!word.endsWith(rule.suffix)) {
      continue;
    }

    const stem = word.slice(0, -rule.suffix.length);

    if (stem.length < 2) {
      continue;
    }

    matches.push({
      rule: rule.name,
      lemma: `${stem}${rule.lemmaEnding}`
    });
  }

  return matches;
}

function isKnownVerbLemma(lemma) {
  const meta = metadata[lemma];

  if (!dictionaryWords.has(lemma)) {
    return false;
  }
  if (meta) {
    return Boolean(meta.cr?.includes("VER"));
  }

  return ALLOW_INFERRED_ER_LEMMAS && lemma.endsWith("ER");
}

function getDecision(row, acceptedMatches) {
  if (row.families.includes("blocked-lefff-proper-noun") || row.families.includes("blocked-lefff-non-lexical")) {
    return "not-generated";
  }
  if (acceptedMatches.length > 0) {
    return "accept-rule-generated";
  }
  if (row.families.includes("verb-inflection") || row.families.includes("verb-suffix-ambiguous")) {
    return "review";
  }

  return "not-generated";
}

function summarizeAcceptedRules(rows) {
  const rules = {};

  for (const row of rows) {
    for (const match of row.acceptedMatches) {
      rules[match.rule] ??= { count: 0, examples: [] };
      rules[match.rule].count += 1;
      if (rules[match.rule].examples.length < 100) {
        rules[match.rule].examples.push(`${row.word}<-${match.lemma}`);
      }
    }
  }

  return sortSummary(rules);
}

function summarizeDecisions(rows) {
  const decisions = {};

  for (const row of rows) {
    decisions[row.decision] ??= { count: 0, examples: [] };
    decisions[row.decision].count += 1;
    if (decisions[row.decision].examples.length < 100) {
      decisions[row.decision].examples.push(row.word);
    }
  }

  return sortSummary(decisions);
}

function sortSummary(summary) {
  return Object.fromEntries(Object.entries(summary).sort(([, first], [, second]) => second.count - first.count));
}

function parseWordList(source) {
  return new Set(source.split(/\r?\n/).map((word) => normalizeWord(word)).filter(Boolean));
}

function normalizeWord(word) {
  return word
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^A-Za-z]/g, "")
    .toUpperCase();
}
