import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const INPUT_PATH = process.argv[2] ?? "lexicon/sources/lefff-3.4.mlex";
const OUTPUT_PATH = process.argv[3] ?? "lexicon/generated/lefff-forms.txt";
const REPORT_PATH = process.argv[4] ?? "lexicon/generated/lefff-report.json";
const METADATA_PATH = process.argv[5] ?? "lexicon/generated/lefff-metadata.json";
const MIN_LENGTH = 2;
const MAX_LENGTH = 13;

const source = await readLefffSource(INPUT_PATH);
const words = new Set();
const metadata = {};
const report = {
  generatedAt: new Date().toISOString(),
  mode: "reference-only",
  source: INPUT_PATH,
  output: OUTPUT_PATH,
  metadata: METADATA_PATH,
  note: "Liste Lefff normalisée pour comparaison locale. Elle n'est pas intégrée au dictionnaire jouable.",
  rows: 0,
  acceptedWords: 0,
  acceptedOccurrences: 0,
  rejectedOccurrences: 0,
  categories: {},
  lengths: {},
  rejectionsByReason: {},
  samples: {
    accepted: [],
    rejected: []
  }
};

for (const line of source.split(/\r?\n/)) {
  const trimmed = line.trim();

  if (!trimmed || trimmed.startsWith("#")) {
    continue;
  }

  report.rows += 1;
  const row = parseLefffLine(trimmed);
  const rejectionReason = getRejectionReason(row.form);

  if (rejectionReason) {
    report.rejectedOccurrences += 1;
    count(report.rejectionsByReason, rejectionReason);
    addSample(report.samples.rejected, `${row.form}\t${rejectionReason}`);
    continue;
  }

  const word = normalizeWord(row.form);
  words.add(word);
  mergeMetadata(metadata, word, row);
  report.acceptedOccurrences += 1;
  count(report.lengths, String(word.length));

  if (row.category) {
    count(report.categories, row.category);
  }

  addSample(report.samples.accepted, word);
}

const sortedWords = [...words].sort((first, second) => first.localeCompare(second));
report.acceptedWords = sortedWords.length;
report.lengths = sortObject(report.lengths, numericKeySort);
report.categories = sortObject(report.categories);
report.rejectionsByReason = sortObject(report.rejectionsByReason);

await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
await mkdir(path.dirname(REPORT_PATH), { recursive: true });
await mkdir(path.dirname(METADATA_PATH), { recursive: true });
await writeFile(OUTPUT_PATH, `${sortedWords.join("\n")}\n`);
await writeFile(METADATA_PATH, `${JSON.stringify(sortMetadata(metadata), null, 2)}\n`);
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

console.log(`Référence Lefff générée : ${sortedWords.length} mots -> ${path.relative(process.cwd(), OUTPUT_PATH)}`);
console.log(`Métadonnées générées -> ${path.relative(process.cwd(), METADATA_PATH)}`);
console.log(`Rapport généré -> ${path.relative(process.cwd(), REPORT_PATH)}`);

async function readLefffSource(inputPath) {
  if (inputPath.endsWith(".zip")) {
    const entries = listZipEntries(inputPath);
    const entry = entries.find((name) => /\.(mlex|elex|txt|tsv|csv)$/i.test(name));

    if (!entry) {
      throw new Error(`Aucun fichier .mlex, .elex, .txt, .tsv ou .csv trouvé dans ${inputPath}.`);
    }

    return readZipEntry(inputPath, entry);
  }

  if (inputPath.endsWith(".gz")) {
    const result = spawnSync("gzip", ["-dc", inputPath], {
      encoding: "utf8",
      maxBuffer: 512 * 1024 * 1024
    });

    if (result.status !== 0) {
      console.error(result.stderr);
      throw new Error(`Impossible de lire ${inputPath}.`);
    }

    return result.stdout;
  }

  return readFile(inputPath, "utf8");
}

function listZipEntries(zipPath) {
  const result = spawnSync("unzip", ["-Z", "-1", zipPath], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024
  });

  if (result.status !== 0) {
    console.error(result.stderr);
    throw new Error(`Impossible de lister ${zipPath}.`);
  }

  return result.stdout.split(/\r?\n/).filter(Boolean);
}

function readZipEntry(zipPath, entryPath) {
  const result = spawnSync("unzip", ["-p", zipPath, entryPath], {
    encoding: "utf8",
    maxBuffer: 512 * 1024 * 1024
  });

  if (result.status !== 0) {
    console.error(result.stderr);
    throw new Error(`Impossible de lire ${entryPath} dans ${zipPath}.`);
  }

  return result.stdout;
}

function parseLefffLine(line) {
  const columns = line.split(/\t+/);
  const form = columns[0] ?? "";
  const tag = columns[1] ?? "";
  const lemma = columns[2] ?? "";

  return {
    form,
    lemma,
    tag,
    category: inferCategory(tag)
  };
}

function inferCategory(tag) {
  const normalized = tag.toLowerCase();

  if (!normalized) {
    return "";
  }
  if (normalized.startsWith("v")) {
    return "verb";
  }
  if (normalized === "np") {
    return "proper-noun";
  }
  if (normalized.startsWith("n")) {
    return "noun";
  }
  if (normalized === "adj") {
    return "adjective";
  }
  if (normalized === "adv") {
    return "adverb";
  }
  if (normalized.startsWith("det")) {
    return "determiner";
  }
  if (normalized.startsWith("pro")) {
    return "pronoun";
  }
  if (["coo", "csu", "epsilon", "parentf", "parento", "poncts", "ponctw", "pres"].includes(normalized)) {
    return "non-lexical";
  }

  return tag.split(/[;:, ]/)[0] ?? tag;
}

function getRejectionReason(rawWord) {
  if (!rawWord) {
    return "empty";
  }
  if (!/^[\p{Letter}]+$/u.test(rawWord)) {
    return "non-letter-form";
  }

  const word = normalizeWord(rawWord);

  if (!word) {
    return "empty-after-normalization";
  }
  if (word.length < MIN_LENGTH) {
    return "too-short";
  }
  if (word.length > MAX_LENGTH) {
    return "too-long";
  }

  return null;
}

function normalizeWord(word) {
  return word
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^A-Za-z]/g, "")
    .toUpperCase();
}

function count(target, key) {
  target[key] = (target[key] ?? 0) + 1;
}

function mergeMetadata(target, word, row) {
  target[word] ??= {
    c: {},
    t: {},
    l: []
  };

  if (row.category) {
    count(target[word].c, row.category);
  }
  if (row.tag) {
    count(target[word].t, row.tag);
  }

  const lemma = normalizeWord(row.lemma);

  if (lemma && !target[word].l.includes(lemma) && target[word].l.length < 8) {
    target[word].l.push(lemma);
  }
}

function sortMetadata(metadata) {
  return Object.fromEntries(
    Object.entries(metadata)
      .sort(([first], [second]) => first.localeCompare(second))
      .map(([word, value]) => [
        word,
        {
          c: sortObject(value.c),
          t: sortObject(value.t),
          l: value.l.sort((first, second) => first.localeCompare(second))
        }
      ])
  );
}

function addSample(samples, value) {
  if (samples.length < 50) {
    samples.push(value);
  }
}

function sortObject(object, sorter = (first, second) => first.localeCompare(second)) {
  return Object.fromEntries(Object.entries(object).sort(([first], [second]) => sorter(first, second)));
}

function numericKeySort(first, second) {
  return Number(first) - Number(second);
}
