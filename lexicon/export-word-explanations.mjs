import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";

const VERSION = "4.00.5";
const OUTPUT_PATHS = [
  "lexicon/releases/4.00.5/serenimot-lexicon-4.00.5.explanations.json"
];
const ACTIVE_WORDS_PATH = "public/static/dictionary/lexique4005.txt";
const SPLIT_OUTPUT_DIRECTORIES = [
  {
    directory: "public/static/dictionary",
    filePrefix: "lexique4005.explanations",
    manifestPath: "public/static/dictionary/lexique4005.explanations.manifest.json",
    splitLengths: [2, 3, 4]
  },
  {
    directory: "lexicon/releases/4.00.5",
    filePrefix: "serenimot-lexicon-4.00.5.explanations",
    manifestPath: "lexicon/releases/4.00.5/serenimot-lexicon-4.00.5.explanations.manifest.json",
    splitLengths: [2, 3, 4, 5, 6, 7, 8, 9]
  }
];
const ALL_SPLIT_LENGTHS = [2, 3, 4, 5, 6, 7, 8, 9];
const SPLIT_INITIALS = "abcdefghijklmnopqrstuvwxyz".split("");
const SOURCE_FILES = [
  "src/domain/rules/dictionary.ts",
  "src/domain/rules/wordExplanations.ts"
];
const GENERATED_EXPLANATION_PATHS = [
  "lexicon/generated/generated-9-letter-word-explanations.json",
  "lexicon/generated/generated-8-letter-word-explanations.json",
  "lexicon/generated/generated-7-letter-word-explanations.json",
  "lexicon/generated/generated-6-letter-word-explanations.json",
  "lexicon/generated/generated-5-letter-word-explanations.json",
  "lexicon/generated/generated-4-letter-word-explanations.json",
  "lexicon/generated/generated-3-letter-word-explanations.json"
];

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "serenimot-word-explanations-"));
fs.writeFileSync(path.join(tempDir, "package.json"), JSON.stringify({ type: "commonjs" }));

for (const sourceFile of SOURCE_FILES) {
  const source = fs
    .readFileSync(sourceFile, "utf8")
    .replace(/import\.meta\.env\.BASE_URL/g, '"/"');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true
    }
  }).outputText;
  const outputFile = path.join(tempDir, path.basename(sourceFile).replace(/\.ts$/, ".js"));

  fs.writeFileSync(outputFile, output);
}

const requireFromTemp = createRequire(path.join(tempDir, "wordExplanations.js"));
const { BUNDLED_WORD_EXPLANATIONS, loadWordExplanationsFromText, getKnownWordExplanations } =
  requireFromTemp("./wordExplanations.js");
const generatedExplanations = GENERATED_EXPLANATION_PATHS.flatMap((generatedPath) =>
  fs.existsSync(generatedPath) ? JSON.parse(fs.readFileSync(generatedPath, "utf8")).entries ?? [] : []
);
const mergedExplanations = {
  ...Object.fromEntries(generatedExplanations.map((entry) => [entry.word, entry])),
  ...BUNDLED_WORD_EXPLANATIONS
};

loadWordExplanationsFromText(JSON.stringify({ entries: Object.values(mergedExplanations) }));

const activeWords = new Set(fs.readFileSync(ACTIVE_WORDS_PATH, "utf8").split(/\r?\n/).filter(Boolean));
const entries = getKnownWordExplanations().filter((entry) => activeWords.has(entry.word));
const payload = {
  version: VERSION,
  license: {
    name: "Creative Commons Attribution-ShareAlike 4.0 International",
    url: "https://creativecommons.org/licenses/by-sa/4.0/"
  },
  entries
};

for (const outputPath of OUTPUT_PATHS) {
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
}

for (const { directory, filePrefix, manifestPath, splitLengths } of SPLIT_OUTPUT_DIRECTORIES) {
  const lengthFiles = [];
  const initialFiles = [];

  for (const staleLength of ALL_SPLIT_LENGTHS.filter((length) => !splitLengths.includes(length))) {
    const stalePath = path.join(directory, `${filePrefix}-${staleLength}.json`);

    if (fs.existsSync(stalePath)) {
      fs.unlinkSync(stalePath);
    }
  }

  for (const length of splitLengths) {
    const filename = `${filePrefix}-${length}.json`;
    const outputPath = path.join(directory, filename);
    const splitPayload = {
      ...payload,
      entries: entries.filter((entry) => entry.word.length === length)
    };
    fs.writeFileSync(outputPath, `${JSON.stringify(splitPayload, null, 2)}\n`);
    lengthFiles.push({
      length,
      path: filename,
      entries: splitPayload.entries.length,
      bytes: fs.statSync(outputPath).size
    });
  }

  for (const initial of SPLIT_INITIALS) {
    const filename = `${filePrefix}-${initial}.json`;
    const outputPath = path.join(directory, filename);
    const splitPayload = {
      ...payload,
      entries: entries.filter((entry) => entry.word.toLocaleLowerCase("fr-CH").startsWith(initial))
    };
    fs.writeFileSync(outputPath, `${JSON.stringify(splitPayload, null, 2)}\n`);
    initialFiles.push({
      initial,
      path: filename,
      entries: splitPayload.entries.length,
      bytes: fs.statSync(outputPath).size
    });
  }

  const manifest = {
    version: VERSION,
    generatedAt: new Date().toISOString(),
    license: payload.license,
    totalEntries: entries.length,
    files: {
      full: fs.existsSync(path.join(directory, `${filePrefix}.json`))
        ? {
            path: `${filePrefix}.json`,
            entries: entries.length,
            bytes: fs.statSync(path.join(directory, `${filePrefix}.json`)).size
          }
        : null,
      byLength: lengthFiles,
      byInitial: initialFiles
    }
  };

  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

console.log(`Exported ${entries.length} word explanations.`);
console.log("Exported split explanation files for configured public and release lengths.");
console.log(`Exported split explanation files for initials ${SPLIT_INITIALS.join(", ")}.`);
