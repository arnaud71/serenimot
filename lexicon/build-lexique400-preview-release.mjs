import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

const VERSION = "4.00.1-preview";
const SOURCE_WORDS_PATH = process.argv[2] ?? "lexicon/generated/lexique400-candidate-filtered-short.txt";
const BUILD_REPORT_PATH = process.argv[3] ?? "lexicon/generated/lexique400-candidate-filtered-short-report.json";
const ODS8_REPORT_PATH =
  process.argv[4] ?? "lexicon/generated/lexique400-candidate-filtered-short-ods8-compatibility-report.json";
const SHORT_WORD_REPORT_PATH = process.argv[5] ?? "lexicon/generated/lexique400-remaining-short-words-review-report.json";
const PREVIEW_DIR = process.argv[6] ?? `lexicon/previews/${VERSION}`;

const outputWordsPath = path.join(PREVIEW_DIR, `serenimot-lexicon-${VERSION}.txt`);
const manifestPath = path.join(PREVIEW_DIR, `serenimot-lexicon-${VERSION}.manifest.json`);
const notesPath = path.join(PREVIEW_DIR, `serenimot-lexicon-${VERSION}.notes.md`);

const wordsSource = await readFile(SOURCE_WORDS_PATH, "utf8");
const words = wordsSource.split(/\r?\n/).filter(Boolean);
const buildReport = JSON.parse(await readFile(BUILD_REPORT_PATH, "utf8"));
const ods8Report = JSON.parse(await readFile(ODS8_REPORT_PATH, "utf8"));
const shortWordReport = JSON.parse(await readFile(SHORT_WORD_REPORT_PATH, "utf8"));
const sha256 = createHash("sha256").update(wordsSource).digest("hex");

const manifest = {
  version: VERSION,
  label: `Lexique Serenimot ${VERSION}`,
  status: "preview",
  generatedAt: new Date().toISOString(),
  activeInApplication: false,
  license: {
    name: "Creative Commons Attribution-ShareAlike 4.0 International",
    url: "https://creativecommons.org/licenses/by-sa/4.0/"
  },
  sources: [
    {
      name: "Lexique",
      version: "4.00",
      url: "https://www.lexique.org/"
    },
    {
      name: "Lexique Serenimot",
      version: "3.83.1",
      role: "base courante conservee pour eviter les regressions avant revue"
    },
    {
      name: "Morphalou",
      version: "3.1",
      role: "croisement local et analyse des formes"
    },
    {
      name: "Lefff",
      version: "3.4",
      role: "croisement local et analyse des formes"
    },
    {
      name: "ODS",
      version: "8",
      role: "comparaison locale uniquement, non redistribuee, non integree"
    }
  ],
  files: {
    words: path.relative(PREVIEW_DIR, outputWordsPath),
    manifest: path.relative(PREVIEW_DIR, manifestPath),
    notes: path.relative(PREVIEW_DIR, notesPath)
  },
  integrity: {
    wordsSha256: sha256,
    wordsCount: words.length
  },
  counts: {
    words: words.length,
    previousFilteredCandidate: buildReport.counts.input,
    shortWordExclusionsApplied: buildReport.counts.appliedExclusions,
    commonWithOds8Local: ods8Report.counts.common,
    previewOnlyAgainstOds8Local: ods8Report.counts.serenimotOnly,
    ods8OnlyAgainstPreviewLocal: ods8Report.counts.referenceOnly,
    acceptedByOds8LocalRatio: ods8Report.ratios.serenimotAcceptedByReference,
    ods8CoveredByPreviewLocalRatio: ods8Report.ratios.referenceCoveredBySerenimot,
    remainingShortWordsOutsideOds8Local: shortWordReport.counts.reviewed
  },
  shortWordPolicy: {
    document: "lexicon/SHORT_WORD_POLICY.md",
    structuredPolicy: "lexicon/short-word-policy.json",
    remainingReview: SHORT_WORD_REPORT_PATH,
    byDecision: shortWordReport.byDecision
  },
  notes: [
    "Preview non activee dans l'application.",
    "ODS 8 est utilise uniquement comme comparaison locale et n'est pas redistribue dans cette preview.",
    "Le candidat conserve des mots du lexique courant pour eviter les pertes avant revue humaine."
  ]
};

await mkdir(PREVIEW_DIR, { recursive: true });
await copyFile(SOURCE_WORDS_PATH, outputWordsPath);
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
await writeFile(notesPath, buildNotes(manifest));

console.log(`Preview ${VERSION} -> ${path.relative(process.cwd(), PREVIEW_DIR)}`);
console.log(`Mots -> ${path.relative(process.cwd(), outputWordsPath)}`);
console.log(`Manifeste -> ${path.relative(process.cwd(), manifestPath)}`);
console.log(`Notes -> ${path.relative(process.cwd(), notesPath)}`);
console.log(`Mots preview : ${words.length}`);
console.log(`SHA-256 : ${sha256}`);

function buildNotes(data) {
  return `# ${data.label}

Statut : preview locale, non activee dans l'application.

## Contenu

- mots : ${data.counts.words}
- fichier : \`${data.files.words}\`
- SHA-256 : \`${data.integrity.wordsSha256}\`
- licence : [${data.license.name}](${data.license.url})

## Sources

- Lexique 4.00 : source principale de migration.
- Lexique Serenimot 3.83.1 : base courante conservee pour eviter les regressions avant revue.
- Morphalou 3.1 : croisement local.
- Lefff 3.4 : croisement local.
- ODS 8 : comparaison locale uniquement, non redistribuee et non integree.

## Compatibilite locale ODS 8

- mots communs : ${data.counts.commonWithOds8Local}
- mots de la preview absents d'ODS 8 local : ${data.counts.previewOnlyAgainstOds8Local}
- mots ODS 8 absents de la preview : ${data.counts.ods8OnlyAgainstPreviewLocal}
- part de la preview acceptee par ODS 8 local : ${(data.counts.acceptedByOds8LocalRatio * 100).toFixed(2)} %
- couverture ODS 8 locale : ${(data.counts.ods8CoveredByPreviewLocalRatio * 100).toFixed(2)} %

## Mots courts

- exclusions mots courts appliquees : ${data.counts.shortWordExclusionsApplied}
- mots courts restants hors ODS 8 local : ${data.counts.remainingShortWordsOutsideOds8Local}
- politique : \`${data.shortWordPolicy.document}\`
- politique structuree : \`${data.shortWordPolicy.structuredPolicy}\`

## Activation

Cette preview ne remplace pas \`public/static/dictionary/lexique383.txt\`.
Pour l'activer plus tard, il faudra creer une etape explicite de promotion, mettre a jour la version affichee dans l'application et verifier la compatibilite hors ligne.
`;
}
