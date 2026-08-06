import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const INPUT_PATH = process.argv[2] ?? "lexicon/sources/Lexique383.tsv";
const OUTPUT_PATH = process.argv[3] ?? "public/static/dictionary/lexique383.txt";
const METADATA_PATH = process.argv[4] ?? "lexicon/generated/lexique383-metadata.json";
const REPORT_PATH = process.argv[5] ?? "lexicon/generated/lexique383-report.json";
const REJECTIONS_PATH = process.argv[6] ?? "lexicon/generated/lexique383-rejections.tsv";
const EXTRA_INPUT_SPECS = process.argv.slice(7).filter((argument) => !argument.startsWith("--exclude="));
const EXCLUSION_INPUT_PATHS = process.argv
  .slice(7)
  .filter((argument) => argument.startsWith("--exclude="))
  .map((argument) => argument.slice("--exclude=".length))
  .filter(Boolean);
const MIN_LENGTH = 2;
const MAX_LENGTH = 13;
const MAX_REJECTION_EXAMPLES = 80;

const DEMO_WORDS = [
  "AMI",
  "AMIE",
  "AIMER",
  "AIR",
  "ART",
  "BLEU",
  "BON",
  "CALME",
  "CHAT",
  "CLAIR",
  "DIRE",
  "DOUX",
  "EAU",
  "ELAN",
  "ETOILE",
  "ILE",
  "JARDIN",
  "JEU",
  "JOLI",
  "LIRE",
  "LUNE",
  "MAIN",
  "MAISON",
  "MER",
  "MOT",
  "NUIT",
  "OR",
  "PAIX",
  "PAGE",
  "PARLER",
  "PONT",
  "RIRE",
  "ROSE",
  "ROUTE",
  "SAGE",
  "SEREIN",
  "SOLEIL",
  "TEMPS",
  "TERRE",
  "VIE"
];

const EXCLUDED_WORDS = new Set([
  // Règle Sérénimot : refuser les abréviations, symboles d'unités et formes tronquées
  // même lorsqu'ils apparaissent comme entrées lexicales dans Lexique.
  "BD",
  "CD",
  "CM",
  "DIAM",
  "DM",
  "DVD",
  "FM",
  "KG",
  "KM",
  "M2",
  "M3",
  "MG",
  "ML",
  "MM",
  "SMS",
  "TV",
  "WC"
]);

const ALLOWED_GRAMMATICAL_CATEGORIES = new Set([
  "ADJ",
  "ADV",
  "ART",
  "AUX",
  "CON",
  "LIA",
  "NOM",
  "ONO",
  "PRE",
  "PRO",
  "VER"
]);

const source = await readFile(INPUT_PATH, "utf8");
const [headerLine, ...lines] = source.split(/\r?\n/);
const headers = headerLine.split("\t");
const indexes = buildIndexes(headers);

for (const requiredColumn of ["ortho", "lemme", "cgram"]) {
  if (indexes[requiredColumn] === -1) {
    throw new Error(`Le fichier Lexique doit contenir la colonne ${requiredColumn}.`);
  }
}

const words = new Set(DEMO_WORDS);
const metadata = new Map();
const report = createEmptyReport(headers);
const rejectionRows = ["word\treason\tcategory\tlemma\tphon\tmorphoder\tline"];
const activeExcludedWords = new Set(EXCLUDED_WORDS);

for (const exclusionInputPath of EXCLUSION_INPUT_PATHS) {
  const extraExcludedWords = await readExtraWords(exclusionInputPath);
  report.exclusionInputs.push({
    path: exclusionInputPath,
    words: extraExcludedWords.length
  });
  for (const extraExcludedWord of extraExcludedWords) {
    activeExcludedWords.add(extraExcludedWord);
  }
}

for (const demoWord of DEMO_WORDS) {
  const entry = getOrCreateMetadata(metadata, demoWord);
  entry.sources.add("demo");
}

for (const [lineIndex, line] of lines.entries()) {
  if (!line.trim()) {
    continue;
  }

  report.sourceRows += 1;
  const columns = line.split("\t");
  const row = parseRow(columns, indexes);
  const normalizedWord = normalizeWord(row.ortho);
  const normalizedLemma = normalizeWord(row.lemme);
  const categoryRoot = row.cgram.split(":")[0];
  const trace = {
    word: normalizedWord,
    category: row.cgram,
    categoryRoot,
    lemma: normalizedLemma,
    phon: row.phon,
    morphoder: row.morphoder,
    line: lineIndex + 2
  };

  count(report.categories, row.cgram || "(vide)");
  count(report.categoryRoots, categoryRoot || "(vide)");
  count(report.lengths, String(normalizedWord.length));
  if (row.genre) {
    count(report.genders, row.genre);
  }
  if (row.nombre) {
    count(report.numbers, row.nombre);
  }

  const rejectionReason = getRejectionReason(row, normalizedWord, categoryRoot);

  if (rejectionReason) {
    count(report.rejectionsByReason, rejectionReason);
    addRejectionExample(report, rejectionReason, trace);
    if (rejectionRows.length <= MAX_REJECTION_EXAMPLES + 1) {
      rejectionRows.push(formatRejectionRow(trace, rejectionReason));
    }
    continue;
  }

  words.add(normalizedWord);
  addMetadata(metadata, normalizedWord, row, normalizedLemma);
}

for (const excludedWord of activeExcludedWords) {
  words.delete(excludedWord);
  metadata.delete(excludedWord);
}

for (const extraInputSpec of EXTRA_INPUT_SPECS) {
  const extraInput = parseExtraInputSpec(extraInputSpec);
  const extraWords = await readExtraWords(extraInput.path);
  report.extraInputs.push({
    path: extraInput.path,
    source: extraInput.source,
    flag: extraInput.flag,
    words: extraWords.length
  });

  for (const extraWord of extraWords) {
    if (activeExcludedWords.has(extraWord)) {
      continue;
    }
    words.add(extraWord);
    const entry = getOrCreateMetadata(metadata, extraWord);
    entry.sources.add(extraInput.source);
    entry.flags.add(extraInput.flag);
  }
}

const sortedWords = [...words].sort((first, second) => first.localeCompare(second));
const sortedMetadata = Object.fromEntries(
  sortedWords.map((word) => [word, finalizeMetadata(metadata.get(word) ?? getOrCreateMetadata(metadata, word))])
);
const content = `${sortedWords.join("\n")}\n`;
const finalizedReport = finalizeReport(report, sortedWords, sortedMetadata);

await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
await mkdir(path.dirname(METADATA_PATH), { recursive: true });
await mkdir(path.dirname(REPORT_PATH), { recursive: true });
await mkdir(path.dirname(REJECTIONS_PATH), { recursive: true });
await writeFile(OUTPUT_PATH, content);
await writeFile(METADATA_PATH, `${JSON.stringify(sortedMetadata)}\n`);
await writeFile(REPORT_PATH, `${JSON.stringify(finalizedReport, null, 2)}\n`);
await writeFile(REJECTIONS_PATH, `${rejectionRows.join("\n")}\n`);

console.log(`Dictionnaire généré : ${sortedWords.length} mots -> ${path.relative(process.cwd(), OUTPUT_PATH)}`);
console.log(`Métadonnées générées -> ${path.relative(process.cwd(), METADATA_PATH)}`);
console.log(`Rapport généré -> ${path.relative(process.cwd(), REPORT_PATH)}`);

function buildIndexes(headers) {
  return Object.fromEntries(headers.map((header, index) => [header, index]));
}

function parseRow(columns, indexes) {
  return {
    ortho: getColumn(columns, indexes, "ortho"),
    phon: getColumn(columns, indexes, "phon"),
    lemme: getColumn(columns, indexes, "lemme"),
    cgram: getColumn(columns, indexes, "cgram"),
    genre: getColumn(columns, indexes, "genre"),
    nombre: getColumn(columns, indexes, "nombre"),
    freqlemfilms2: getColumn(columns, indexes, "freqlemfilms2"),
    freqlemlivres: getColumn(columns, indexes, "freqlemlivres"),
    freqfilms2: getColumn(columns, indexes, "freqfilms2"),
    freqlivres: getColumn(columns, indexes, "freqlivres"),
    infover: getColumn(columns, indexes, "infover"),
    nbhomogr: getColumn(columns, indexes, "nbhomogr"),
    nbhomoph: getColumn(columns, indexes, "nbhomoph"),
    islem: getColumn(columns, indexes, "islem"),
    nblettres: getColumn(columns, indexes, "nblettres"),
    nbphons: getColumn(columns, indexes, "nbphons"),
    syll: getColumn(columns, indexes, "syll"),
    nbsyll: getColumn(columns, indexes, "nbsyll"),
    cgramortho: getColumn(columns, indexes, "cgramortho"),
    deflem: getColumn(columns, indexes, "deflem"),
    defobs: getColumn(columns, indexes, "defobs"),
    old20: getColumn(columns, indexes, "old20"),
    pld20: getColumn(columns, indexes, "pld20"),
    morphoder: getColumn(columns, indexes, "morphoder"),
    nbmorph: getColumn(columns, indexes, "nbmorph")
  };
}

function getColumn(columns, indexes, name) {
  const index = indexes[name];
  return index === undefined || index === -1 ? "" : (columns[index] ?? "").trim();
}

function getRejectionReason(row, normalizedWord, categoryRoot) {
  if (!normalizedWord) {
    return "empty-after-normalization";
  }
  if (!ALLOWED_GRAMMATICAL_CATEGORIES.has(categoryRoot)) {
    return "category-not-allowed";
  }
  if (!/^[\p{Letter}]+$/u.test(row.ortho)) {
    return "non-letter-form";
  }
  if (normalizedWord.length < MIN_LENGTH) {
    return "too-short";
  }
  if (normalizedWord.length > MAX_LENGTH) {
    return "too-long";
  }
  if (EXCLUDED_WORDS.has(normalizedWord)) {
    return "manual-exclusion";
  }
  return null;
}

function addMetadata(metadata, word, row, normalizedLemma) {
  const entry = getOrCreateMetadata(metadata, word);
  entry.sources.add("lexique383");
  entry.forms.add(row.ortho);
  if (normalizedLemma) {
    entry.lemmas.add(normalizedLemma);
  }
  addOptional(entry.categories, row.cgram);
  addOptional(entry.categoryRoots, row.cgram.split(":")[0]);
  addOptional(entry.genders, row.genre);
  addOptional(entry.numbers, row.nombre);
  addOptional(entry.infover, row.infover);
  addOptional(entry.syllables, row.syll);
  addOptional(entry.cgramortho, row.cgramortho);
  addOptional(entry.deflem, row.deflem);
  addOptional(entry.defobs, row.defobs);
  addOptional(entry.morphoder, row.morphoder);

  entry.frequency.films = maxNumber(entry.frequency.films, row.freqfilms2);
  entry.frequency.books = maxNumber(entry.frequency.books, row.freqlivres);
  entry.frequency.lemmaFilms = maxNumber(entry.frequency.lemmaFilms, row.freqlemfilms2);
  entry.frequency.lemmaBooks = maxNumber(entry.frequency.lemmaBooks, row.freqlemlivres);
  entry.letterCount = maxNumber(entry.letterCount, row.nblettres);
  entry.phonemeCount = maxNumber(entry.phonemeCount, row.nbphons);
  entry.syllableCount = maxNumber(entry.syllableCount, row.nbsyll);
  entry.homographCount = maxNumber(entry.homographCount, row.nbhomogr);
  entry.homophoneCount = maxNumber(entry.homophoneCount, row.nbhomoph);
  entry.morphCount = maxNumber(entry.morphCount, row.nbmorph);
  entry.isLemma = entry.isLemma || row.islem === "1";

  if (isLikelyAbbreviation(word, row)) {
    entry.flags.add("likely-abbreviation");
  }
}

function getOrCreateMetadata(metadata, word) {
  if (!metadata.has(word)) {
    metadata.set(word, {
      sources: new Set(),
      forms: new Set(),
      lemmas: new Set(),
      categories: new Set(),
      categoryRoots: new Set(),
      genders: new Set(),
      numbers: new Set(),
      infover: new Set(),
      syllables: new Set(),
      cgramortho: new Set(),
      deflem: new Set(),
      defobs: new Set(),
      morphoder: new Set(),
      flags: new Set(),
      frequency: {
        films: null,
        books: null,
        lemmaFilms: null,
        lemmaBooks: null
      },
      letterCount: word.length,
      phonemeCount: null,
      syllableCount: null,
      homographCount: null,
      homophoneCount: null,
      morphCount: null,
      isLemma: false
    });
  }
  return metadata.get(word);
}

function finalizeMetadata(entry) {
  return omitEmpty({
    l: sorted(entry.lemmas),
    c: sorted(entry.categories),
    cr: sorted(entry.categoryRoots),
    g: sorted(entry.genders),
    n: sorted(entry.numbers),
    iv: sorted(entry.infover),
    sy: sorted(entry.syllables),
    co: sorted(entry.cgramortho),
    md: sorted(entry.morphoder),
    fl: sorted(entry.flags),
    fq: omitEmpty(entry.frequency),
    lc: entry.letterCount,
    pc: entry.phonemeCount,
    sc: entry.syllableCount,
    hg: entry.homographCount,
    hp: entry.homophoneCount,
    mc: entry.morphCount,
    il: entry.isLemma || undefined
  });
}

function createEmptyReport(headers) {
  return {
    generatedAt: new Date().toISOString(),
    source: INPUT_PATH,
    output: OUTPUT_PATH,
    metadata: METADATA_PATH,
    headers,
    sourceRows: 0,
    acceptedWords: 0,
    categories: {},
    categoryRoots: {},
    genders: {},
    numbers: {},
    lengths: {},
    rejectionsByReason: {},
    rejectionExamples: {},
    acceptedByLength: {},
    acceptedWithFlags: {},
    extraInputs: [],
    exclusionInputs: []
  };
}

function finalizeReport(report, sortedWords, sortedMetadata) {
  report.acceptedWords = sortedWords.length;
  for (const word of sortedWords) {
    count(report.acceptedByLength, String(word.length));
    for (const flag of sortedMetadata[word].fl ?? []) {
      count(report.acceptedWithFlags, flag);
    }
  }
  return sortReport(report);
}

function sortReport(report) {
  return {
    ...report,
    categories: sortObject(report.categories),
    categoryRoots: sortObject(report.categoryRoots),
    genders: sortObject(report.genders),
    numbers: sortObject(report.numbers),
    lengths: sortObject(report.lengths, numericKeySort),
    rejectionsByReason: sortObject(report.rejectionsByReason),
    acceptedByLength: sortObject(report.acceptedByLength, numericKeySort),
    acceptedWithFlags: sortObject(report.acceptedWithFlags)
  };
}

function addRejectionExample(report, reason, trace) {
  report.rejectionExamples[reason] ??= [];
  if (report.rejectionExamples[reason].length < 8) {
    report.rejectionExamples[reason].push(trace);
  }
}

function formatRejectionRow(trace, reason) {
  return [trace.word, reason, trace.category, trace.lemma, trace.phon, trace.morphoder, trace.line]
    .map((value) => String(value).replace(/\t/g, " "))
    .join("\t");
}

function isLikelyAbbreviation(word, row) {
  const phonLetters = normalizeWord(row.phon);
  return (
    word.length <= 4 &&
    (row.cgram.includes(":num") ||
      row.morphoder.includes(":num") ||
      phonLetters.length >= word.length + 4 ||
      /^[A-Z]{2,4}$/.test(word) && row.syll && normalizeWord(row.syll).length >= word.length + 4)
  );
}

function addOptional(set, value) {
  if (value) {
    set.add(value);
  }
}

function maxNumber(current, value) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    return current;
  }
  return current === null ? parsed : Math.max(current, parsed);
}

function count(target, key) {
  target[key] = (target[key] ?? 0) + 1;
}

function sorted(set) {
  return [...set].sort((first, second) => first.localeCompare(second));
}

function sortObject(object, sorter = (first, second) => first.localeCompare(second)) {
  return Object.fromEntries(Object.entries(object).sort(([first], [second]) => sorter(first, second)));
}

function omitEmpty(object) {
  return Object.fromEntries(
    Object.entries(object).filter(([, value]) => {
      if (value === undefined || value === null) {
        return false;
      }
      if (Array.isArray(value) && value.length === 0) {
        return false;
      }
      if (typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0) {
        return false;
      }
      return true;
    })
  );
}

function numericKeySort(first, second) {
  return Number(first) - Number(second);
}

function parseExtraInputSpec(spec) {
  const [sourcePath, source = "extra-derived", flag = "derived-form"] = spec.split(":");

  if (!sourcePath) {
    throw new Error(`Entrée de formes dérivées invalide : ${spec}`);
  }

  return {
    path: sourcePath,
    source,
    flag
  };
}

async function readExtraWords(sourcePath) {
  let source;

  try {
    source = await readFile(sourcePath, "utf8");
  } catch (error) {
    throw new Error(`Liste de formes dérivées introuvable : ${sourcePath}`, { cause: error });
  }

  return [
    ...new Set(
      source
        .split(/\r?\n/)
        .map((word) => normalizeWord(word))
        .filter((word) => word.length >= MIN_LENGTH && word.length <= MAX_LENGTH)
    )
  ];
}

function normalizeWord(word) {
  return word
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^A-Za-z]/g, "")
    .toUpperCase();
}
