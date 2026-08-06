import { mkdir, readFile, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const WORDS_PATH = process.argv[2] ?? "public/static/dictionary/lexique4005.txt";
const EXISTING_EXPLANATIONS_PATH =
  process.argv[3] ?? "lexicon/releases/4.00.5/serenimot-lexicon-4.00.5.explanations.json";
const OUTPUT_PATH = process.argv[4] ?? "lexicon/generated/three-letter-wiktionary-definitions.json";
const REPORT_PATH = process.argv[5] ?? "lexicon/generated/three-letter-wiktionary-definitions-report.json";
const API_URL = "https://fr.wiktionary.org/w/api.php";
const BATCH_SIZE = 45;
const execFileAsync = promisify(execFile);

const words = (await readFile(WORDS_PATH, "utf8"))
  .split(/\r?\n/)
  .filter((word) => word.length === 3);
const existingExplanations = JSON.parse(await readFile(EXISTING_EXPLANATIONS_PATH, "utf8"));
const generatedThreeLetterWords = words.filter((word) =>
  existingExplanations.entries.some((entry) => entry.word === word && entry.reviewed === false)
);
const cache = await readJsonIfExists(OUTPUT_PATH, { generatedAt: null, source: null, entries: {} });
const entries = { ...(cache.entries ?? {}) };
const pendingWords = generatedThreeLetterWords.filter((word) => !entries[word]?.definition);

for (let index = 0; index < pendingWords.length; index += BATCH_SIZE) {
  const chunk = pendingWords.slice(index, index + BATCH_SIZE);
  const fetched = await fetchDefinitions(chunk);

  for (const result of fetched) {
    entries[result.word] = result;
  }

  console.log(`Fetched ${Math.min(index + chunk.length, pendingWords.length)} / ${pendingWords.length}`);

  if (index + BATCH_SIZE < pendingWords.length) {
    await sleep(1200);
  }
}

const payload = {
  generatedAt: new Date().toISOString(),
  source: {
    name: "Wiktionnaire",
    url: "https://fr.wiktionary.org/",
    api: API_URL,
    license: "Creative Commons Attribution-ShareAlike 4.0 International"
  },
  entries: Object.fromEntries(Object.entries(entries).sort(([first], [second]) => first.localeCompare(second)))
};
const report = {
  generatedAt: payload.generatedAt,
  mode: "three-letter-wiktionary-definitions",
  inputs: {
    words: WORDS_PATH,
    explanations: EXISTING_EXPLANATIONS_PATH
  },
  outputs: {
    definitions: OUTPUT_PATH,
    report: REPORT_PATH
  },
  counts: {
    generatedThreeLetterWords: generatedThreeLetterWords.length,
    fetchedThisRun: pendingWords.length,
    definitionsFound: Object.values(payload.entries).filter((entry) => entry.definition).length,
    definitionsMissing: Object.values(payload.entries).filter((entry) => !entry.definition).length
  },
  missing: Object.values(payload.entries)
    .filter((entry) => !entry.definition)
    .map((entry) => entry.word)
};

await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
await mkdir(path.dirname(REPORT_PATH), { recursive: true });
await writeFile(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`);
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

console.log(`Definitions found: ${report.counts.definitionsFound}/${report.counts.generatedThreeLetterWords}`);
console.log(`Definitions -> ${OUTPUT_PATH}`);
console.log(`Report -> ${REPORT_PATH}`);

async function fetchDefinitions(wordsToFetch) {
  const url = new URL(API_URL);
  url.searchParams.set("action", "query");
  url.searchParams.set("format", "json");
  url.searchParams.set("formatversion", "2");
  url.searchParams.set("prop", "revisions");
  url.searchParams.set("rvprop", "content");
  url.searchParams.set("rvslots", "main");
  url.searchParams.set("redirects", "1");
  url.searchParams.set("titles", wordsToFetch.map((word) => word.toLocaleLowerCase("fr-CH")).join("|"));

  try {
    const { stdout } = await execFileAsync(
      "curl",
      [
        "-L",
        "--fail",
        "--silent",
        "--show-error",
        "--max-time",
        "20",
        "-H",
        "User-Agent: SerenimotLexiconBuilder/0.1 (local lexicon build)",
        url.toString()
      ],
      { maxBuffer: 2 * 1024 * 1024 }
    );
    const payload = JSON.parse(stdout);
    const normalizedTitles = getNormalizedTitles(payload);
    const pagesByTitle = Object.fromEntries(
      (payload.query?.pages ?? []).map((page) => [String(page.title).toLocaleUpperCase("fr-CH"), page])
    );

    return wordsToFetch.map((word) => {
      const normalizedTitle = normalizedTitles[word] ?? word;
      const title = normalizedTitle.toLocaleLowerCase("fr-CH");
      const page = pagesByTitle[normalizedTitle];
      const wikitext = page?.revisions?.[0]?.slots?.main?.content ?? page?.revisions?.[0]?.content ?? "";
      const definition = extractFrenchDefinition(wikitext);

      return {
        word,
        definition,
        sourceUrl: `https://fr.wiktionary.org/wiki/${encodeURIComponent(title)}`,
        status: definition ? "found" : "missing"
      };
    });
  } catch (error) {
    return wordsToFetch.map((word) => ({
      word,
      definition: "",
      sourceUrl: `https://fr.wiktionary.org/wiki/${encodeURIComponent(word.toLocaleLowerCase("fr-CH"))}`,
      status: "error",
      error: error instanceof Error ? error.message : String(error)
    }));
  }
}

function extractFrenchDefinition(extract) {
  const frenchSection = getFrenchSection(extract);
  const lines = frenchSection.split(/\r?\n/).map((line) => line.trim());
  const definitions = [];
  let insideDefinitionSection = false;

  for (const line of lines) {
    if (/^={3,}\s*\{\{S\|(nom|verbe|adjectif|adverbe|interjection|pronom|conjonction|préposition|article|lettre|symbole)[|}]/u.test(line)) {
      insideDefinitionSection = true;
      continue;
    }

    if (/^={3,}\s*(Nom commun|Verbe|Adjectif|Adverbe|Interjection|Pronom|Conjonction|Préposition|Article|Lettre|Symbole)\s*={3,}$/u.test(line)) {
      insideDefinitionSection = true;
      continue;
    }

    if (/^={3,}/u.test(line)) {
      insideDefinitionSection = false;
      continue;
    }

    if (!insideDefinitionSection || !isDefinitionLine(line)) {
      continue;
    }

    definitions.push(cleanDefinitionLine(line));

    if (definitions.length >= 1) {
      break;
    }
  }

  return definitions.join(" ");
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

  return extract;
}

function getNormalizedTitles(payload) {
  const normalizedTitles = {};

  for (const item of payload.query?.normalized ?? []) {
    normalizedTitles[String(item.from).toLocaleUpperCase("fr-CH")] = String(item.to).toLocaleUpperCase("fr-CH");
  }

  for (const item of payload.query?.redirects ?? []) {
    normalizedTitles[String(item.from).toLocaleUpperCase("fr-CH")] = String(item.to).toLocaleUpperCase("fr-CH");
  }

  return normalizedTitles;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
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
  return line
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
    .replace(/^./u, (letter) => letter.toLocaleUpperCase("fr-CH")) + ".";
}

async function readJsonIfExists(filePath, fallback) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}
