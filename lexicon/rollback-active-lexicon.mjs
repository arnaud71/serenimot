import { readFile, writeFile } from "node:fs/promises";

const APPLY = process.argv.includes("--apply");

const DICTIONARY_TS_PATH = "src/domain/rules/dictionary.ts";
const PREVIEW_TS_PATH = "src/domain/rules/lexiconPreview.ts";
const PREVIEW_MANIFEST_PATH = "public/static/dictionary/releases/lexique4005.manifest.json";
const ROLLBACK_DICTIONARY_PATH = "public/static/dictionary/lexique383.txt";
const EXPECTED_ROLLBACK_WORD_COUNT = 359420;

const dictionaryWords = (await readFile(ROLLBACK_DICTIONARY_PATH, "utf8")).split(/\r?\n/).filter(Boolean);
if (dictionaryWords.length !== EXPECTED_ROLLBACK_WORD_COUNT) {
  throw new Error(
    `Rollback refuse : ${ROLLBACK_DICTIONARY_PATH} contient ${dictionaryWords.length} mots au lieu de ${EXPECTED_ROLLBACK_WORD_COUNT}.`
  );
}

const plannedChanges = [
  `${DICTIONARY_TS_PATH} -> charge static/dictionary/lexique383.txt`,
  `${DICTIONARY_TS_PATH} -> version 3.83.1 et source Lexique 3.83`,
  `${PREVIEW_TS_PATH} -> lexique 4.00.5 indique comme non actif`,
  `${PREVIEW_MANIFEST_PATH} -> status inactive-release et activeInApplication false`
];

if (!APPLY) {
  console.log("Dry-run rollback lexique actif.");
  console.log("Aucun fichier modifie.");
  console.log(`Fichier de retour verifie : ${ROLLBACK_DICTIONARY_PATH} (${dictionaryWords.length} mots).`);
  for (const change of plannedChanges) {
    console.log(`- ${change}`);
  }
  console.log("Relancer avec --apply pour appliquer le rollback.");
  process.exit(0);
}

await replaceInFile(DICTIONARY_TS_PATH, [
  [
    'export const DICTIONARY_FILE_PATH = `${import.meta.env.BASE_URL}static/dictionary/lexique4005.txt`;',
    'export const DICTIONARY_FILE_PATH = `${import.meta.env.BASE_URL}static/dictionary/lexique383.txt`;'
  ],
  ['export const ORIGINAL_LEXICON_LABEL = "Lexique 4.00";', 'export const ORIGINAL_LEXICON_LABEL = "Lexique 3.83";'],
  [
    'export const ORIGINAL_LEXICON_SOURCE_LABEL = "Lexique 4.00, Boris New et Christophe Pallier";',
    'export const ORIGINAL_LEXICON_SOURCE_LABEL = "Lexique 3.83, Boris New et Christophe Pallier";'
  ],
  ['export const SERENIMOT_LEXICON_VERSION = "4.00.5";', 'export const SERENIMOT_LEXICON_VERSION = "3.83.1";']
]);

await replaceInFile(PREVIEW_TS_PATH, [
  ['statusLabel: "Version activée",', 'statusLabel: "Version en préparation",'],
  ["activeInApplication: true,", "activeInApplication: false,"]
]);

const manifest = JSON.parse(await readFile(PREVIEW_MANIFEST_PATH, "utf8"));
manifest.status = "inactive-release";
manifest.activeInApplication = false;
manifest.notes = (manifest.notes ?? []).map((note) =>
  note === "Version active dans l'application." ? "Version non active dans l'application." : note
);
await writeFile(PREVIEW_MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);

console.log("Rollback applique.");
for (const change of plannedChanges) {
  console.log(`- ${change}`);
}

async function replaceInFile(filePath, replacements) {
  let source = await readFile(filePath, "utf8");

  for (const [from, to] of replacements) {
    if (!source.includes(from)) {
      throw new Error(`Rollback refuse : motif introuvable dans ${filePath} : ${from}`);
    }
    source = source.replace(from, to);
  }

  await writeFile(filePath, source);
}
