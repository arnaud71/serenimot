import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const REVIEW_PATH = process.argv[2] ?? "lexicon/generated/ods8-go5-active-rule-generation-review.tsv";
const METADATA_PATH = process.argv[3] ?? "lexicon/generated/lexique400-preview-metadata.json";
const REPORT_PATH = process.argv[4] ?? "lexicon/generated/ods8-go5-active-quality-report.json";
const TSV_PATH = process.argv[5] ?? "lexicon/generated/ods8-go5-active-quality-review.tsv";

const metadata = JSON.parse(await readFile(METADATA_PATH, "utf8"));
const acceptedRows = parseRows(await readFile(REVIEW_PATH, "utf8")).filter((row) => row.decision === "accept-rule-generated");
const qualityRows = acceptedRows
  .map((row) => {
    const matches = row.acceptedMatches.map((match) => ({
      ...match,
      lemmaHasMetadata: Boolean(metadata[match.lemma]),
      lemmaIsKnownVerb: Boolean(metadata[match.lemma]?.cr?.includes("VER"))
    }));
    const riskTags = getRiskTags(row, matches);

    return {
      ...row,
      matches,
      qualityDecision: getQualityDecision(riskTags),
      riskTags
    };
  })
  .sort(
    (first, second) =>
      qualityPriority(first.qualityDecision) - qualityPriority(second.qualityDecision) ||
      second.riskTags.length - first.riskTags.length ||
      first.length - second.length ||
      first.word.localeCompare(second.word)
  );

const report = {
  generatedAt: new Date().toISOString(),
  mode: "rule-generated-active-quality-review",
  note: "Controle qualite des formes generees par regles. Ce rapport ne modifie pas le dictionnaire.",
  inputs: {
    review: REVIEW_PATH,
    metadata: METADATA_PATH
  },
  outputs: {
    report: REPORT_PATH,
    review: TSV_PATH
  },
  counts: {
    accepted: qualityRows.length,
    autoAccept: qualityRows.filter((row) => row.qualityDecision === "auto-accept").length,
    acceptWithNote: qualityRows.filter((row) => row.qualityDecision === "accept-with-note").length,
    reviewBeforeActivation: qualityRows.filter((row) => row.qualityDecision === "review-before-activation").length,
    blockBeforeActivation: qualityRows.filter((row) => row.qualityDecision === "block-before-activation").length
  },
  byRiskTag: countByList(qualityRows, "riskTags"),
  byRule: countMatchesBy(qualityRows, "rule"),
  byLemmaMetadata: {
    allMatchesHaveVerbMetadata: qualityRows.filter((row) => row.matches.every((match) => match.lemmaIsKnownVerb)).length,
    hasInferredLemma: qualityRows.filter((row) => row.matches.some((match) => !match.lemmaHasMetadata)).length
  },
  samples: sampleBy(qualityRows, "qualityDecision")
};

const tsvRows = [
  "word\tqualityDecision\triskTags\tlength\tacceptedRules\tacceptedLemmas\tfamilies\tmetadataStatus",
  ...qualityRows.map((row) =>
    [
      row.word,
      row.qualityDecision,
      row.riskTags.join(","),
      row.length,
      row.matches.map((match) => match.rule).join(","),
      row.matches.map((match) => match.lemma).join(","),
      row.families.join(","),
      row.matches
        .map((match) => `${match.lemma}:${match.lemmaIsKnownVerb ? "verb-metadata" : match.lemmaHasMetadata ? "non-verb-metadata" : "inferred"}`)
        .join(",")
    ].join("\t")
  )
];

await mkdir(path.dirname(REPORT_PATH), { recursive: true });
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(TSV_PATH, `${tsvRows.join("\n")}\n`);

console.log(`Rapport qualite regles -> ${path.relative(process.cwd(), REPORT_PATH)}`);
console.log(`Revue qualite -> ${path.relative(process.cwd(), TSV_PATH)}`);
console.log(`Formes analysees : ${report.counts.accepted}`);
console.log(`Acceptables automatiquement : ${report.counts.autoAccept}`);
console.log(`Acceptables avec note : ${report.counts.acceptWithNote}`);
console.log(`A revoir avant activation : ${report.counts.reviewBeforeActivation}`);
console.log(`A bloquer avant activation : ${report.counts.blockBeforeActivation}`);

function parseRows(source) {
  const [headerLine, ...lines] = source.split(/\r?\n/);
  const headers = headerLine.split("\t");

  return lines
    .filter((line) => line.trim())
    .map((line) => {
      const columns = line.split("\t");
      const row = Object.fromEntries(headers.map((header, index) => [header, columns[index] ?? ""]));
      const acceptedMatches = splitList(row.acceptedMatches || row.candidateLemmas).map((match) => {
        const [rule, lemma] = match.split(":");
        return { rule, lemma };
      });

      return {
        word: row.word,
        decision: row.decision,
        length: Number(row.length),
        primaryFamily: row.primaryFamily,
        families: splitList(row.families),
        acceptedMatches
      };
    });
}

function getRiskTags(row, matches) {
  const tags = [];
  const families = new Set(row.families);

  if (row.length <= 4) {
    tags.push("short-form");
  }
  if (families.has("blocked-lefff-proper-noun") || families.has("blocked-lefff-non-lexical")) {
    tags.push("blocked-lefff");
  }
  if (matches.length > 1) {
    tags.push("multiple-rule-matches");
  }
  if (matches.some((match) => !match.lemmaHasMetadata)) {
    tags.push("inferred-lemma-without-metadata");
  }
  if (matches.some((match) => match.lemmaHasMetadata && !match.lemmaIsKnownVerb)) {
    tags.push("lemma-not-tagged-verb");
  }
  if (matches.some((match) => match.rule.includes("subj-imperfect"))) {
    tags.push("rare-tense");
  }
  if (!families.has("verb-inflection") && !families.has("verb-suffix-ambiguous") && looksLikeProperDerivative(row.word)) {
    tags.push("proper-derivative-shape");
  }

  return tags.length ? tags : ["clean"];
}

function getQualityDecision(riskTags) {
  const tags = new Set(riskTags);

  if (tags.has("blocked-lefff") || tags.has("lemma-not-tagged-verb") || tags.has("proper-derivative-shape")) {
    return "block-before-activation";
  }
  if (tags.has("short-form") || tags.has("inferred-lemma-without-metadata")) {
    return "review-before-activation";
  }
  if (tags.has("multiple-rule-matches") || tags.has("rare-tense")) {
    return "accept-with-note";
  }

  return "auto-accept";
}

function looksLikeProperDerivative(word) {
  return /(?:AIS|AISE|OIS|OISE|IEN|IENNE|EEN|EENNE|AIN|AINE)S?$/u.test(word);
}

function splitList(value) {
  return value ? value.split(",").filter(Boolean) : [];
}

function countByList(rows, property) {
  const counts = {};
  for (const row of rows) {
    for (const value of row[property]) {
      counts[value] = (counts[value] ?? 0) + 1;
    }
  }
  return sortCounts(counts);
}

function countMatchesBy(rows, property) {
  const counts = {};
  for (const row of rows) {
    for (const match of row.matches) {
      counts[match[property]] = (counts[match[property]] ?? 0) + 1;
    }
  }
  return sortCounts(counts);
}

function sampleBy(rows, property) {
  const samples = {};
  for (const row of rows) {
    const value = row[property];
    samples[value] ??= [];
    if (samples[value].length < 100) {
      samples[value].push({
        word: row.word,
        riskTags: row.riskTags,
        matches: row.matches.map((match) => `${match.rule}:${match.lemma}`)
      });
    }
  }
  return samples;
}

function qualityPriority(decision) {
  return {
    "block-before-activation": 1,
    "review-before-activation": 2,
    "accept-with-note": 3,
    "auto-accept": 4
  }[decision] ?? 99;
}

function sortCounts(counts) {
  return Object.fromEntries(Object.entries(counts).sort(([, first], [, second]) => second - first));
}
