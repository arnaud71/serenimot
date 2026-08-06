import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ACTIVE_WORDS_PATH = process.argv[2] ?? "public/static/dictionary/lexique4005.txt";
const LEXIQUE400_PATH = process.argv[3] ?? "lexicon/sources/Lexique400.tsv";
const LEGACY_METADATA_PATH = process.argv[4] ?? "lexicon/generated/lexique383-metadata.json";
const OUTPUT_PATH = process.argv[5] ?? "lexicon/generated/lexique400-preview-metadata.json";
const REPORT_PATH = process.argv[6] ?? "lexicon/generated/lexique400-preview-metadata-report.json";
const GO5_REVIEW_PATH = process.argv[7] ?? "lexicon/generated/ods8-go5-active-rule-generation-review.tsv";
const GO6_REVIEW_PATH = process.argv[8] ?? "lexicon/generated/ods8-go6-active-rule-generation-review.tsv";

const activeWords = parseWordList(await readFile(ACTIVE_WORDS_PATH, "utf8"));
const legacyMetadata = JSON.parse(await readFile(LEGACY_METADATA_PATH, "utf8"));
const lexique400Metadata = parseLexique400Metadata(await readFile(LEXIQUE400_PATH, "utf8"));
const go5Metadata = await buildRuleGeneratedMetadata(GO5_REVIEW_PATH, legacyMetadata, lexique400Metadata, {
  source: "rule-generated-go5",
  flag: "rule-generated-ods8-filtered",
  rulePrefix: "go5"
});
const go6Metadata = await buildRuleGeneratedMetadata(GO6_REVIEW_PATH, legacyMetadata, lexique400Metadata, {
  source: "rule-generated-go6",
  flag: "rule-generated-go6-ods8-filtered",
  rulePrefix: "go6"
});
const mergedMetadata = {};
const report = {
  generatedAt: new Date().toISOString(),
  mode: "active-preview-metadata",
  note: "Metadonnees compactes du lexique actif 4.00.5. Fusion de Lexique 4.00 et des metadonnees Serenimot 3.83 existantes.",
  inputs: {
    activeWords: ACTIVE_WORDS_PATH,
    lexique400: LEXIQUE400_PATH,
    legacyMetadata: LEGACY_METADATA_PATH,
    go5Review: GO5_REVIEW_PATH,
    go6Review: GO6_REVIEW_PATH
  },
  outputs: {
    metadata: OUTPUT_PATH,
    report: REPORT_PATH
  },
  counts: {
    activeWords: activeWords.size,
    withLexique400Metadata: 0,
    withLegacyMetadata: 0,
    withGo5Metadata: 0,
    withGo6Metadata: 0,
    withMergedMetadata: 0,
    withoutMetadata: 0,
    verbLemmas: 0
  },
  bySource: {},
  samples: {
    withoutMetadata: [],
    lexique400Only: [],
    legacyOnly: [],
    merged: []
  }
};

for (const word of [...activeWords].sort((first, second) => first.localeCompare(second))) {
  const legacy = legacyMetadata[word];
  const lexique400 = lexique400Metadata[word];
  const go5 = go5Metadata[word];
  const go6 = go6Metadata[word];
  const merged = mergeMetadata(mergeMetadata(mergeMetadata(legacy, lexique400), go5), go6);

  if (lexique400) {
    report.counts.withLexique400Metadata += 1;
  }
  if (legacy) {
    report.counts.withLegacyMetadata += 1;
  }
  if (go5) {
    report.counts.withGo5Metadata += 1;
  }
  if (go6) {
    report.counts.withGo6Metadata += 1;
  }
  if (merged) {
    mergedMetadata[word] = merged;
    report.counts.withMergedMetadata += 1;
    for (const source of merged.src ?? []) {
      count(report.bySource, source);
    }
    if (merged.cr?.includes("VER") && merged.il) {
      report.counts.verbLemmas += 1;
    }
    addSample(report.samples, legacy, lexique400 || go5 || go6, word);
  } else {
    report.counts.withoutMetadata += 1;
    if (report.samples.withoutMetadata.length < 200) {
      report.samples.withoutMetadata.push(word);
    }
  }
}

report.bySource = sortCounts(report.bySource);

await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
await writeFile(OUTPUT_PATH, `${JSON.stringify(mergedMetadata)}\n`);
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

console.log(`Metadonnees actives -> ${path.relative(process.cwd(), OUTPUT_PATH)}`);
console.log(`Rapport -> ${path.relative(process.cwd(), REPORT_PATH)}`);
console.log(`Mots actifs : ${report.counts.activeWords}`);
console.log(`Avec metadonnees : ${report.counts.withMergedMetadata}`);
console.log(`Sans metadonnees : ${report.counts.withoutMetadata}`);
console.log(`Lemmes verbaux : ${report.counts.verbLemmas}`);

function parseLexique400Metadata(source) {
  const [headerLine, ...lines] = source.split(/\r?\n/);
  const indexes = Object.fromEntries(headerLine.split("\t").map((header, index) => [header, index]));
  const metadata = {};

  for (const line of lines) {
    if (!line.trim()) {
      continue;
    }

    const columns = line.split("\t");
    const word = normalizeWord(getColumn(columns, indexes, "ortho"));
    const lemma = normalizeWord(getColumn(columns, indexes, "lemme"));
    const category = getColumn(columns, indexes, "cgram");
    const categoryRoot = category.split(":")[0];

    if (!word || !categoryRoot) {
      continue;
    }

    const entry = metadata[word] ?? createEntry(word);
    entry.src.add("lexique400");
    addOptional(entry.l, lemma);
    addOptional(entry.c, category);
    addOptional(entry.cr, categoryRoot);
    addOptional(entry.g, getColumn(columns, indexes, "genre"));
    addOptional(entry.n, getColumn(columns, indexes, "nombre"));
    addOptional(entry.iv, getColumn(columns, indexes, "infover"));
    addOptional(entry.sy, getColumn(columns, indexes, "syll"));
    addOptional(entry.co, getColumn(columns, indexes, "cgramortho"));
    addOptional(entry.md, getColumn(columns, indexes, "morphoder"));
    entry.fq.films = maxNumber(entry.fq.films, getColumn(columns, indexes, "freqfilms2"));
    entry.fq.books = maxNumber(entry.fq.books, getColumn(columns, indexes, "freqlivres"));
    entry.fq.lemmaFilms = maxNumber(entry.fq.lemmaFilms, getColumn(columns, indexes, "freqlemfilms2"));
    entry.fq.lemmaBooks = maxNumber(entry.fq.lemmaBooks, getColumn(columns, indexes, "freqlemlivres"));
    entry.lc = maxNumber(entry.lc, getColumn(columns, indexes, "nblettres")) ?? word.length;
    entry.pc = maxNumber(entry.pc, getColumn(columns, indexes, "nbphons"));
    entry.sc = maxNumber(entry.sc, getColumn(columns, indexes, "nbsyll"));
    entry.hg = maxNumber(entry.hg, getColumn(columns, indexes, "nbhomogr"));
    entry.hp = maxNumber(entry.hp, getColumn(columns, indexes, "nbhomoph"));
    entry.mc = maxNumber(entry.mc, getColumn(columns, indexes, "nbmorph"));
    entry.il = entry.il || getColumn(columns, indexes, "islem") === "1";
    metadata[word] = entry;
  }

  return Object.fromEntries(Object.entries(metadata).map(([word, entry]) => [word, finalizeEntry(entry)]));
}

async function buildRuleGeneratedMetadata(reviewPath, legacyMetadata, lexique400Metadata, options) {
  let source = "";
  try {
    source = await readFile(reviewPath, "utf8");
  } catch {
    return {};
  }

  const rows = parseGo5Rows(source).filter((row) => row.decision === "accept-rule-generated");
  const generatedMetadata = {};

  for (const row of rows) {
    const matches = row.acceptedMatches
      .map((match) => ({
        ...match,
        lemmaMetadata: mergeMetadata(legacyMetadata[match.lemma], lexique400Metadata[match.lemma])
      }))
      .filter((match) => match.lemmaMetadata?.cr?.includes("VER"));

    if (matches.length === 0) {
      continue;
    }

    const lemmas = matches.map((match) => match.lemma);
    const lemmaEntries = matches.map((match) => match.lemmaMetadata);
    const ruleNames = matches.map((match) => match.rule);
    generatedMetadata[row.word] = omitEmpty({
      src: [options.source],
      l: sortedUnique(lemmas),
      c: ["VER"],
      cr: ["VER"],
      g: getGeneratedGenders(ruleNames),
      n: getGeneratedNumbers(ruleNames),
      iv: sortedUnique(ruleNames.map(getVerbInfoForRule)),
      co: ["VER"],
      md: sortedUnique(lemmaEntries.flatMap((entry) => entry.md ?? [])),
      fl: sortedUnique([options.flag, ...ruleNames.map((rule) => `${options.rulePrefix}:${rule}`)]),
      fq: omitEmpty({
        films: maxFromEntries(lemmaEntries, "films"),
        books: maxFromEntries(lemmaEntries, "books"),
        lemmaFilms: maxFromEntries(lemmaEntries, "lemmaFilms"),
        lemmaBooks: maxFromEntries(lemmaEntries, "lemmaBooks")
      }),
      lc: row.word.length,
      pc: maxFromEntries(lemmaEntries, "pc"),
      sc: maxFromEntries(lemmaEntries, "sc"),
      hg: 0,
      hp: maxFromEntries(lemmaEntries, "hp"),
      mc: maxFromEntries(lemmaEntries, "mc")
    });
  }

  return generatedMetadata;
}

function parseGo5Rows(source) {
  const [headerLine, ...lines] = source.split(/\r?\n/);
  const headers = headerLine.split("\t");

  return lines
    .filter((line) => line.trim())
    .map((line) => {
      const columns = line.split("\t");
      const row = Object.fromEntries(headers.map((header, index) => [header, columns[index] ?? ""]));
      return {
        word: row.word,
        decision: row.decision,
        acceptedMatches: splitList(row.acceptedMatches).map((match) => {
          const [rule, lemma] = match.split(":");
          return { rule, lemma };
        })
      };
    });
}

function getVerbInfoForRule(rule) {
  if (rule.includes("present-participle")) {
    return "partpre";
  }
  if (rule.includes("past-participle")) {
    return "partpas";
  }
  if (rule.includes("imperfect")) {
    return "imp";
  }
  if (rule.includes("conditional")) {
    return "cond";
  }
  if (rule.includes("future")) {
    return "fut";
  }
  if (rule.includes("past-simple")) {
    return "psim";
  }
  if (rule.includes("subj-imperfect")) {
    return "subimp";
  }
  if (rule.includes("present")) {
    return "pres";
  }
  return "generated";
}

function getGeneratedGenders(rules) {
  const genders = [];
  for (const rule of rules) {
    if (rule.includes("past-participle-f")) {
      genders.push("f");
    } else if (rule.includes("past-participle-m")) {
      genders.push("m");
    }
  }
  return sortedUnique(genders);
}

function getGeneratedNumbers(rules) {
  const numbers = [];
  for (const rule of rules) {
    if (rule.includes("past-participle") && rule.endsWith("p")) {
      numbers.push("p");
    } else if (rule.includes("past-participle") && rule.endsWith("s")) {
      numbers.push("s");
    }
  }
  return sortedUnique(numbers);
}

function maxFromEntries(entries, property) {
  let value = null;
  for (const entry of entries) {
    value = maxValue(value, entry?.fq?.[property] ?? entry?.[property]);
  }
  return value;
}

function createEntry(word) {
  return {
    src: new Set(),
    l: new Set(),
    c: new Set(),
    cr: new Set(),
    g: new Set(),
    n: new Set(),
    iv: new Set(),
    sy: new Set(),
    co: new Set(),
    md: new Set(),
    fl: new Set(),
    fq: {
      films: null,
      books: null,
      lemmaFilms: null,
      lemmaBooks: null
    },
    lc: word.length,
    pc: null,
    sc: null,
    hg: null,
    hp: null,
    mc: null,
    il: false
  };
}

function mergeMetadata(first, second) {
  if (!first && !second) {
    return null;
  }

  return omitEmpty({
    src: sortedUnique([...(first ? first.src ?? ["lexique383"] : []), ...(second?.src ?? [])]),
    l: sortedUnique([...(first?.l ?? []), ...(second?.l ?? [])]),
    c: sortedUnique([...(first?.c ?? []), ...(second?.c ?? [])]),
    cr: sortedUnique([...(first?.cr ?? []), ...(second?.cr ?? [])]),
    g: sortedUnique([...(first?.g ?? []), ...(second?.g ?? [])]),
    n: sortedUnique([...(first?.n ?? []), ...(second?.n ?? [])]),
    iv: sortedUnique([...(first?.iv ?? []), ...(second?.iv ?? [])]),
    sy: sortedUnique([...(first?.sy ?? []), ...(second?.sy ?? [])]),
    co: sortedUnique([...(first?.co ?? []), ...(second?.co ?? [])]),
    md: sortedUnique([...(first?.md ?? []), ...(second?.md ?? [])]),
    fl: sortedUnique([...(first?.fl ?? []), ...(second?.fl ?? [])]),
    fq: omitEmpty({
      films: maxValue(first?.fq?.films, second?.fq?.films),
      books: maxValue(first?.fq?.books, second?.fq?.books),
      lemmaFilms: maxValue(first?.fq?.lemmaFilms, second?.fq?.lemmaFilms),
      lemmaBooks: maxValue(first?.fq?.lemmaBooks, second?.fq?.lemmaBooks)
    }),
    lc: maxValue(first?.lc, second?.lc),
    pc: maxValue(first?.pc, second?.pc),
    sc: maxValue(first?.sc, second?.sc),
    hg: maxValue(first?.hg, second?.hg),
    hp: maxValue(first?.hp, second?.hp),
    mc: maxValue(first?.mc, second?.mc),
    il: first?.il || second?.il || undefined
  });
}

function finalizeEntry(entry) {
  return omitEmpty({
    src: sorted(entry.src),
    l: sorted(entry.l),
    c: sorted(entry.c),
    cr: sorted(entry.cr),
    g: sorted(entry.g),
    n: sorted(entry.n),
    iv: sorted(entry.iv),
    sy: sorted(entry.sy),
    co: sorted(entry.co),
    md: sorted(entry.md),
    fl: sorted(entry.fl),
    fq: omitEmpty(entry.fq),
    lc: entry.lc,
    pc: entry.pc,
    sc: entry.sc,
    hg: entry.hg,
    hp: entry.hp,
    mc: entry.mc,
    il: entry.il || undefined
  });
}

function getColumn(columns, indexes, name) {
  const aliases = {
    ortho: ["ortho", "1_Mot"],
    phon: ["phon", "2_Phono"],
    lemme: ["lemme", "4_Lemme"],
    cgram: ["cgram", "5_Cgram"],
    cgramortho: ["cgramortho", "6_CgramOrtho"],
    genre: ["genre", "7_Genre"],
    nombre: ["nombre", "8_Nombre"],
    infover: ["infover", "9_InfoVER"],
    freqfilms2: ["freqfilms2", "10_FreqMot"],
    freqlivres: ["freqlivres", "11_FreqOrtho"],
    freqlemfilms2: ["freqlemfilms2", "12_FreqLemme"],
    freqlemlivres: ["freqlemlivres", "12_FreqLemme"],
    islem: ["islem", "14_IsLem"],
    nblettres: ["nblettres", "15_NbLettres"],
    nbphons: ["nbphons", "16_NbPhons"],
    nbhomogr: ["nbhomogr", "23_NbHomog"],
    nbhomoph: ["nbhomoph", "24_NbHomoph"],
    syll: ["syll", "25_SyllPhono"],
    nbsyll: ["nbsyll", "26_SyllNb"],
    morphoder: ["morphoder", "30_MorphoBase"],
    nbmorph: ["nbmorph"]
  };

  for (const alias of aliases[name] ?? [name]) {
    const index = indexes[alias];
    if (index !== undefined && index !== -1) {
      return (columns[index] ?? "").trim();
    }
  }
  return "";
}

function addSample(samples, legacy, lexique400, word) {
  const bucket = legacy && lexique400 ? "merged" : lexique400 ? "lexique400Only" : "legacyOnly";
  if (samples[bucket].length < 200) {
    samples[bucket].push(word);
  }
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
  return current === null || current === undefined ? parsed : Math.max(current, parsed);
}

function maxValue(first, second) {
  if (first === undefined || first === null) {
    return second;
  }
  if (second === undefined || second === null) {
    return first;
  }
  return Math.max(first, second);
}

function sorted(set) {
  return [...set].sort((first, second) => first.localeCompare(second));
}

function sortedUnique(values) {
  return [...new Set(values.filter(Boolean))].sort((first, second) => first.localeCompare(second));
}

function splitList(value) {
  return value ? value.split(",").filter(Boolean) : [];
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

function count(target, key) {
  target[key] = (target[key] ?? 0) + 1;
}

function sortCounts(counts) {
  return Object.fromEntries(Object.entries(counts).sort(([, first], [, second]) => second - first));
}
