import { mkdir, readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

const WORDS_PATH = process.argv[2] ?? "public/static/dictionary/lexique4005.txt";
const DUMP_PATH = process.argv[3] ?? "lexicon/sources/frwiktionary-latest-pages-articles.xml.bz2";
const OUTPUT_PATH = process.argv[4] ?? "lexicon/generated/wiktionary-definitions.json";
const REPORT_PATH = process.argv[5] ?? "lexicon/generated/wiktionary-definitions-report.json";
const SOURCE_URL = "https://dumps.wikimedia.org/frwiktionary/latest/frwiktionary-latest-pages-articles.xml.bz2";

const targetWords = new Set(
  (await readFile(WORDS_PATH, "utf8"))
    .split(/\r?\n/)
    .map((word) => normalizeWord(word))
    .filter(Boolean)
);
const entries = {};
const report = {
  generatedAt: new Date().toISOString(),
  mode: "wiktionary-dump-definitions",
  source: {
    name: "Wiktionnaire",
    url: "https://fr.wiktionary.org/",
    dumpUrl: SOURCE_URL,
    localDump: DUMP_PATH,
    license: "Creative Commons Attribution-ShareAlike 4.0 International"
  },
  inputs: {
    words: WORDS_PATH,
    dump: DUMP_PATH
  },
  outputs: {
    definitions: OUTPUT_PATH,
    report: REPORT_PATH
  },
  counts: {
    targetWords: targetWords.size,
    pagesScanned: 0,
    targetPagesMatched: 0,
    definitionsFound: 0,
    matchedWithoutDefinition: 0,
    uniqueDefinitions: 0,
    uniqueCoverageRatio: 0
  },
  matchedWithoutDefinitionSample: []
};

let currentPage = "";
let insidePage = false;
let lastProgressAt = Date.now();
const bzip = streamBzipXml(DUMP_PATH);

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
  generatedAt: report.generatedAt,
  source: report.source,
  entries: Object.fromEntries(Object.entries(entries).sort(([first], [second]) => first.localeCompare(second)))
};
report.counts.uniqueDefinitions = Object.keys(payload.entries).length;
report.counts.uniqueCoverageRatio = Number((report.counts.uniqueDefinitions / report.counts.targetWords).toFixed(4));

await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
await mkdir(path.dirname(REPORT_PATH), { recursive: true });
await writeFile(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`);
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

console.log(`Pages scanned: ${report.counts.pagesScanned.toLocaleString("fr-CH")}`);
console.log(`Target pages matched: ${report.counts.targetPagesMatched.toLocaleString("fr-CH")}/${report.counts.targetWords.toLocaleString("fr-CH")}`);
console.log(`Definitions found: ${report.counts.definitionsFound.toLocaleString("fr-CH")}`);
console.log(`Definitions -> ${OUTPUT_PATH}`);
console.log(`Report -> ${REPORT_PATH}`);

function processPage(pageXml) {
  report.counts.pagesScanned += 1;

  if (Date.now() - lastProgressAt > 5000) {
    lastProgressAt = Date.now();
    console.log(
      `Scanned ${report.counts.pagesScanned.toLocaleString("fr-CH")} pages, found ${report.counts.definitionsFound.toLocaleString("fr-CH")} definitions`
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

  report.counts.targetPagesMatched += 1;

  const rawWikitext = pageXml.match(/<text\b[^>]*>(?<text>[\s\S]*?)<\/text>/u)?.groups?.text ?? "";
  const wikitext = decodeXml(rawWikitext);
  const definition = extractFrenchDefinition(wikitext);

  if (!definition) {
    report.counts.matchedWithoutDefinition += 1;

    if (report.matchedWithoutDefinitionSample.length < 100) {
      report.matchedWithoutDefinitionSample.push(normalizedTitle);
    }

    return;
  }

  report.counts.definitionsFound += 1;
  entries[normalizedTitle] = {
    word: normalizedTitle,
    definition,
    sourceUrl: `https://fr.wiktionary.org/wiki/${encodeURIComponent(title)}`,
    status: "found"
  };
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

function extractFrenchDefinition(extract) {
  const frenchSection = getFrenchSection(extract);
  const lines = frenchSection.split(/\r?\n/).map((line) => line.trim());
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
