const FALLBACK_WORDS = [
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
  "MON",
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

let dictionaryWords = [...FALLBACK_WORDS].sort();
let dictionarySet = new Set<string>(dictionaryWords);
let dictionaryWordsByLength = buildWordsByLengthIndex(dictionaryWords);
let dictionaryWordsByLetter = buildWordsByLetterIndex(dictionaryWords);
let dictionaryWordsByLetterAndLength = buildWordsByLetterAndLengthIndex(dictionaryWords);

export const DICTIONARY_FILE_PATH = `${import.meta.env.BASE_URL}static/dictionary/lexique4005.txt`;
export const ORIGINAL_LEXICON_LABEL = "Lexique 4.00";
export const ORIGINAL_LEXICON_SOURCE_LABEL = "Lexique 4.00, Boris New et Christophe Pallier";
export const SERENIMOT_LEXICON_VERSION = "4.00.5";
export const DICTIONARY_LABEL = `Lexique Sérénimot ${SERENIMOT_LEXICON_VERSION}`;
export const SERENIMOT_LEXICON_LICENSE = "CC BY-SA 4.0";
export const SERENIMOT_LEXICON_LICENSE_URL = "https://creativecommons.org/licenses/by-sa/4.0/deed.fr";

export function normalizeWord(word: string): string {
  return word
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^A-Za-z]/g, "")
    .toUpperCase();
}

export async function loadDictionaryFromUrl(url = DICTIONARY_FILE_PATH): Promise<number> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Impossible de charger le dictionnaire (${response.status}).`);
  }

  return loadDictionaryFromText(await response.text());
}

export function loadDictionaryFromText(source: string): number {
  const words = source
    .split(/\r?\n/)
    .map((word) => normalizeWord(word))
    .filter((word) => word.length > 0);
  const uniqueWords = [...new Set(words)].sort((first, second) => first.localeCompare(second));

  if (uniqueWords.length === 0) {
    throw new Error("Le dictionnaire chargé est vide.");
  }

  dictionaryWords = uniqueWords;
  dictionarySet = new Set(dictionaryWords);
  dictionaryWordsByLength = buildWordsByLengthIndex(dictionaryWords);
  dictionaryWordsByLetter = buildWordsByLetterIndex(dictionaryWords);
  dictionaryWordsByLetterAndLength = buildWordsByLetterAndLengthIndex(dictionaryWords);

  return dictionaryWords.length;
}

export function isWordAccepted(word: string): boolean {
  return dictionarySet.has(normalizeWord(word));
}

export function getDictionaryWords(): string[] {
  return dictionaryWords;
}

export function getDictionaryWordsByLength(minLength: number, maxLength: number): string[] {
  const words: string[] = [];

  for (let length = minLength; length <= maxLength; length += 1) {
    words.push(...(dictionaryWordsByLength.get(length) ?? []));
  }

  return words;
}

export function getDictionaryWordsContainingLetter(letter: string, maxLength = Infinity): string[] {
  const normalizedLetter = normalizeWord(letter);
  const words = dictionaryWordsByLetter.get(normalizedLetter[0] ?? "") ?? [];

  return Number.isFinite(maxLength) ? words.filter((word) => word.length <= maxLength) : words;
}

export function getDictionaryWordsContainingLetterByLength(letter: string, length: number): string[] {
  const normalizedLetter = normalizeWord(letter);

  return dictionaryWordsByLetterAndLength.get(normalizedLetter[0] ?? "")?.get(length) ?? [];
}

export function getDictionarySize(): number {
  return dictionaryWords.length;
}

export function isFallbackDictionaryActive(): boolean {
  return dictionaryWords.length === FALLBACK_WORDS.length;
}

function buildWordsByLengthIndex(words: string[]): Map<number, string[]> {
  const index = new Map<number, string[]>();

  for (const word of words) {
    const wordsForLength = index.get(word.length) ?? [];
    wordsForLength.push(word);
    index.set(word.length, wordsForLength);
  }

  return index;
}

function buildWordsByLetterIndex(words: string[]): Map<string, string[]> {
  const index = new Map<string, string[]>();

  for (const word of [...words].sort((first, second) => first.length - second.length || first.localeCompare(second))) {
    for (const letter of new Set(word.split(""))) {
      const wordsForLetter = index.get(letter) ?? [];
      wordsForLetter.push(word);
      index.set(letter, wordsForLetter);
    }
  }

  return index;
}

function buildWordsByLetterAndLengthIndex(words: string[]): Map<string, Map<number, string[]>> {
  const index = new Map<string, Map<number, string[]>>();

  for (const word of words) {
    for (const letter of new Set(word.split(""))) {
      const wordsByLength = index.get(letter) ?? new Map<number, string[]>();
      const wordsForLength = wordsByLength.get(word.length) ?? [];
      wordsForLength.push(word);
      wordsByLength.set(word.length, wordsForLength);
      index.set(letter, wordsByLength);
    }
  }

  return index;
}
