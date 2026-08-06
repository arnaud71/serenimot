import { readFile, writeFile, mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

const EXPLANATIONS_PATH =
  process.argv[2] ?? "lexicon/releases/4.00.5/serenimot-lexicon-4.00.5.explanations.json";
const DUMP_PATH = process.argv[3] ?? "lexicon/sources/frwiktionary-latest-pages-articles.xml.bz2";
const OUTPUT_PATH = process.argv[4] ?? "lexicon/generated/generic-wiktionary-gaps.json";

const GENERIC_DEFINITIONS = new Set([
  "Nom lexicalisé.",
  "Mot lexicalisé dans le lexique actif.",
  "Adjectif lexicalisé.",
  "Interjection ou bruit lexicalisé."
]);

const explanations = JSON.parse(await readFile(EXPLANATIONS_PATH, "utf8"));
const genericEntries = explanations.entries.filter(
  (entry) => GENERIC_DEFINITIONS.has(entry.shortDefinition) && !entry.sources.some((source) => source.name === "Wiktionnaire")
);
const targetWords = new Set(genericEntries.map((entry) => entry.word));
const byWord = new Map(genericEntries.map((entry) => [entry.word, entry]));
const matched = [];
const matchedWithoutDefinition = [];
const matchedByRelaxedSection = [];
const bzip = streamBzipXml(DUMP_PATH);

let currentPage = "";
let insidePage = false;
let pagesScanned = 0;
let lastProgressAt = Date.now();

for await (const chunk of bzip.stdout) {
  const text = chunk.toString("utf8");
  let cursor = 0;

  while (cursor < text.length) {
    if (!insidePage) {
      const pageStart = text.indexOf("<page>", cursor);

      if (pageStart < 0) {
        break;
      }

      insidePage = true;
      currentPage = "";
      cursor = pageStart;
    }

    const pageEnd = text.indexOf("</page>", cursor);

    if (pageEnd < 0) {
      currentPage += text.slice(cursor);
      break;
    }

    currentPage += text.slice(cursor, pageEnd + "</page>".length);
    processPage(currentPage);
    currentPage = "";
    insidePage = false;
    cursor = pageEnd + "</page>".length;
  }
}

await bzip.done;

const payload = {
  generatedAt: new Date().toISOString(),
  inputs: {
    explanations: EXPLANATIONS_PATH,
    dump: DUMP_PATH
  },
  counts: {
    genericEntries: genericEntries.length,
    pagesScanned,
    wiktionaryPagesMatched: matched.length + matchedByRelaxedSection.length + matchedWithoutDefinition.length,
    definitionsRecoveredByRelaxedSection: matchedByRelaxedSection.length,
    matchedWithoutDefinition: matchedWithoutDefinition.length
  },
  recoveredSample: matchedByRelaxedSection.slice(0, 200),
  matchedWithoutDefinitionSample: matchedWithoutDefinition.slice(0, 200)
};

await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
await writeFile(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`);

console.log(`Generic entries: ${genericEntries.length.toLocaleString("fr-CH")}`);
console.log(`Recovered by relaxed section: ${matchedByRelaxedSection.length.toLocaleString("fr-CH")}`);
console.log(`Report -> ${OUTPUT_PATH}`);

function processPage(pageXml) {
  pagesScanned += 1;

  if (Date.now() - lastProgressAt > 5000) {
    lastProgressAt = Date.now();
    console.log(
      `Scanned ${pagesScanned.toLocaleString("fr-CH")} pages, recovered ${matchedByRelaxedSection.length.toLocaleString("fr-CH")}`
    );
  }

  const namespace = pageXml.match(/<ns>(?<namespace>\d+)<\/ns>/u)?.groups?.namespace;
  if (namespace !== "0") {
    return;
  }

  const title = decodeXml(pageXml.match(/<title>(?<title>[\s\S]*?)<\/title>/u)?.groups?.title ?? "");
  const normalizedTitle = normalizeWord(title);

  if (!targetWords.has(normalizedTitle)) {
    return;
  }

  const rawWikitext = pageXml.match(/<text\b[^>]*>(?<text>[\s\S]*?)<\/text>/u)?.groups?.text ?? "";
  const wikitext = decodeXml(rawWikitext);
  const strictDefinition = extractFrenchDefinition(wikitext, false);
  const relaxedDefinition = extractFrenchDefinition(wikitext, true);

  if (strictDefinition) {
    matched.push(normalizedTitle);
    return;
  }

  if (relaxedDefinition) {
    const entry = byWord.get(normalizedTitle);

    matchedByRelaxedSection.push({
      word: normalizedTitle,
      currentPartOfSpeech: entry?.partOfSpeech,
      currentDefinition: entry?.shortDefinition,
      suggestedDefinition: relaxedDefinition,
      sourceUrl: `https://fr.wiktionary.org/wiki/${encodeURIComponent(title)}`,
      pageTitle: title
    });
    return;
  }

  matchedWithoutDefinition.push({
    word: normalizedTitle,
    pageTitle: title,
    sourceUrl: `https://fr.wiktionary.org/wiki/${encodeURIComponent(title)}`
  });
}

function streamBzipXml(dumpPath) {
  const childProcess = spawn("bzip2", ["-dc", dumpPath], {
    stdio: ["ignore", "pipe", "pipe"]
  });
  let stderr = "";

  childProcess.stderr.on("data", (chunk) => {
    stderr += chunk.toString("utf8");
  });

  const done = new Promise((resolve, reject) => {
    childProcess.on("error", reject);
    childProcess.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(stderr || `bzip2 exited with code ${code}`));
    });
  });

  return { stdout: childProcess.stdout, done };
}

function extractFrenchDefinition(extract, includeProperNouns) {
  const frenchSection = getFrenchSection(extract);
  const lines = frenchSection.split(/\r?\n/).map((line) => line.trim());
  let insideDefinitionSection = false;
  const templateSections = includeProperNouns
    ? "nom|nom propre|verbe|adjectif|adverbe|interjection|pronom|conjonction|préposition|article|lettre|symbole"
    : "nom|verbe|adjectif|adverbe|interjection|pronom|conjonction|préposition|article|lettre|symbole";
  const plainSections = includeProperNouns
    ? "Nom commun|Nom propre|Verbe|Adjectif|Adverbe|Interjection|Pronom|Conjonction|Préposition|Article|Lettre|Symbole"
    : "Nom commun|Verbe|Adjectif|Adverbe|Interjection|Pronom|Conjonction|Préposition|Article|Lettre|Symbole";

  for (const line of lines) {
    if (new RegExp(`^={3,}\\s*\\{\\{S\\|(${templateSections})[|}]`, "u").test(line)) {
      insideDefinitionSection = true;
      continue;
    }

    if (new RegExp(`^={3,}\\s*(${plainSections})\\s*={3,}$`, "u").test(line)) {
      insideDefinitionSection = true;
      continue;
    }

    if (/^={3,}/u.test(line)) {
      insideDefinitionSection = false;
      continue;
    }

    if (insideDefinitionSection && isDefinitionLine(line)) {
      return cleanDefinitionLine(line);
    }
  }

  return "";
}

function getFrenchSection(extract) {
  const templatedStart = extract.search(/^==\s*\{\{langue\|fr\}\}\s*==\s*$/m);
  if (templatedStart >= 0) {
    const contentStart = extract.indexOf("\n", templatedStart) + 1;
    const rest = extract.slice(contentStart);
    const nextLanguageStart = rest.search(/^==\s*\{\{langue\|[^}]+\}\}\s*==\s*$/m);

    return nextLanguageStart >= 0 ? rest.slice(0, nextLanguageStart) : rest;
  }

  const plainStart = extract.search(/^== Français ==\s*$/m);
  if (plainStart >= 0) {
    const contentStart = extract.indexOf("\n", plainStart) + 1;
    const rest = extract.slice(contentStart);
    const nextLanguageStart = rest.search(/^== [^=]+ ==\s*$/m);

    return nextLanguageStart >= 0 ? rest.slice(0, nextLanguageStart) : rest;
  }

  return "";
}

function isDefinitionLine(line) {
  return (
    line.length >= 8 &&
    line.startsWith("#") &&
    !line.startsWith("#*") &&
    !line.startsWith("#:") &&
    !line.startsWith("*") &&
    !line.startsWith("→") &&
    !line.includes(" : écouter ") &&
    !/^[-–—]/u.test(line) &&
    !/^(Synonymes|Dérivés|Traductions|Prononciation|Anagrammes|Références)$/u.test(line)
  );
}

function cleanDefinitionLine(line) {
  return (
    line
      .replace(/^#+\s*/u, "")
      .replace(/\{\{exemple[\s\S]*/u, "")
      .replace(/\{\{lexique\|([^|}]+)[^}]*\}\}/gu, "($1)")
      .replace(/\{\{([a-zàâçéèêëîïôûùüÿñæœ-]+)\|fr\}\}/giu, "($1)")
      .replace(/\{\{(?:w|lien|lien web)\|([^|}]+)(?:\|[^}]*)?\}\}/gu, "$1")
      .replace(/\{\{[^}]+\}\}/gu, "")
      .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/gu, "$2")
      .replace(/\[\[([^\]]+)\]\]/gu, "$1")
      .replace(/'{2,}/gu, "")
      .replace(/\s+—\s+.*/u, "")
      .replace(/\s+\([^)]*pron[^)]*\)/giu, "")
      .replace(/\s+,/gu, ",")
      .replace(/\s+/gu, " ")
      .replace(/\.$/u, "")
      .trim()
      .replace(/^./u, (letter) => letter.toLocaleUpperCase("fr-CH")) + "."
  );
}

function normalizeWord(word) {
  return word
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^A-Za-z]/g, "")
    .toUpperCase();
}

function decodeXml(value) {
  return value
    .replace(/&lt;/gu, "<")
    .replace(/&gt;/gu, ">")
    .replace(/&quot;/gu, '"')
    .replace(/&apos;/gu, "'")
    .replace(/&#039;/gu, "'")
    .replace(/&amp;/gu, "&");
}
