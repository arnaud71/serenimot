import { useEffect, useMemo, useState } from "react";
import {
  DICTIONARY_FILE_PATH,
  DICTIONARY_LABEL,
  ORIGINAL_LEXICON_LABEL,
  ORIGINAL_LEXICON_SOURCE_LABEL,
  SERENIMOT_LEXICON_LICENSE,
  SERENIMOT_LEXICON_LICENSE_URL,
  SERENIMOT_LEXICON_VERSION
} from "../../domain/rules/dictionary";
import { LEXICON_PREVIEW, LEXICON_PREVIEW_MANIFEST_PATH } from "../../domain/rules/lexiconPreview";
import { getWordCheckResult } from "../../domain/rules/wordCheck";
import {
  formatWordExplanationDefinition,
  getKnownWordExplanations,
  searchWordExplanations,
  type WordExplanation
} from "../../domain/rules/wordExplanations";

type ExplanationLengthFilter = "all" | "2" | "3" | "4" | "5" | "6" | "7" | "8";
type ExplanationSourceFilter = "all" | "wiktionary" | "lexique-only";
type ExplanationKindFilter = "all" | "linked" | "plural" | "verb";

type LexiconScreenProps = {
  dictionarySize: number;
  explanationsSize: number;
  explanationsStatus: "idle" | "loading" | "partial" | "ready" | "fallback";
  hasGame: boolean;
  onExplanationInitialRequested: (initial: string) => void;
  onBack: () => void;
};

const SOURCE_CARDS = [
  {
    title: `${ORIGINAL_LEXICON_LABEL} utilisée`,
    href: "https://www.lexique.org/databases/Lexique400/",
    text: `${ORIGINAL_LEXICON_SOURCE_LABEL}. Source originale ouverte utilisée comme socle du dictionnaire jouable actuellement activé.`
  },
  {
    title: "Morphalou 3.1",
    href: "https://www.ortolang.fr/market/lexicons/morphalou",
    text: "Ressource ouverte de formes fléchies, utilisée pour enrichir les pluriels, dérivés et conjugaisons."
  },
  {
    title: "LGLex-Lefff 3.4",
    href: "https://huggingface.co/datasets/datasets-CNRS/lglex-lefff-3.4",
    text: "Ressource morphologique utilisée pour croiser les formes et repérer notamment les noms propres."
  },
  {
    title: "Référence ODS 8 non intégrée",
    text: "Référence de comparaison non intégrée et non distribuée. Elle sert de garde-fou de compatibilité, pas de source du lexique."
  }
];

const FILTER_CARDS = [
  "Les noms propres sont filtrés.",
  "Les sigles et abréviations sont limités.",
  "Les accents sont normalisés pour les lettres du jeu.",
  "Les mots trop longs pour le plateau restent hors jeu.",
  "Les formes douteuses restent documentées par source."
];

const DISPLAYED_EXPLANATION_LIMIT = 160;

const LENGTH_FILTER_OPTIONS: { value: ExplanationLengthFilter; label: string }[] = [
  { value: "all", label: "Toutes longueurs" },
  { value: "2", label: "2 lettres" },
  { value: "3", label: "3 lettres" },
  { value: "4", label: "4 lettres" },
  { value: "5", label: "5 lettres" },
  { value: "6", label: "6 lettres" },
  { value: "7", label: "7 lettres" },
  { value: "8", label: "8 lettres" }
];

const SOURCE_FILTER_OPTIONS: { value: ExplanationSourceFilter; label: string }[] = [
  { value: "all", label: "Toutes sources" },
  { value: "wiktionary", label: "Wiktionnaire" },
  { value: "lexique-only", label: "Lexique seul" }
];

const KIND_FILTER_OPTIONS: { value: ExplanationKindFilter; label: string }[] = [
  { value: "all", label: "Tous types" },
  { value: "linked", label: "Liées au lemme" },
  { value: "plural", label: "Pluriels" },
  { value: "verb", label: "Verbes" }
];

export function LexiconScreen({
  dictionarySize,
  explanationsSize,
  explanationsStatus,
  hasGame,
  onExplanationInitialRequested,
  onBack
}: LexiconScreenProps) {
  const [explanationQuery, setExplanationQuery] = useState("");
  const [explanationLengthFilter, setExplanationLengthFilter] = useState<ExplanationLengthFilter>("all");
  const [explanationSourceFilter, setExplanationSourceFilter] = useState<ExplanationSourceFilter>("all");
  const [explanationKindFilter, setExplanationKindFilter] = useState<ExplanationKindFilter>("all");
  const [wordCheckQuery, setWordCheckQuery] = useState("");
  const wordExplanations = getKnownWordExplanations();
  const wiktionaryExplanationCount = wordExplanations.filter(hasWiktionarySource).length;
  const lexiqueExplanationCount = wordExplanations.filter(hasLexiqueSource).length;
  const lexiqueOnlyExplanationCount = wordExplanations.filter(isLexiqueOnlyExplanation).length;
  const linkedExplanationCount = wordExplanations.filter((entry) => Boolean(entry.baseWord)).length;
  const filteredWordExplanations = useMemo(
    () =>
      searchWordExplanations(explanationQuery).filter(
        (entry) =>
          matchesLengthFilter(entry, explanationLengthFilter) &&
          matchesSourceFilter(entry, explanationSourceFilter) &&
          matchesKindFilter(entry, explanationKindFilter)
      ),
    [explanationKindFilter, explanationLengthFilter, explanationQuery, explanationSourceFilter]
  );
  const displayedWordExplanations = filteredWordExplanations.slice(0, DISPLAYED_EXPLANATION_LIMIT);
  const hiddenExplanationCount = Math.max(0, filteredWordExplanations.length - displayedWordExplanations.length);
  const sourceDashboardStats = useMemo(
    () => [
      {
        label: "Wiktionnaire",
        value: wiktionaryExplanationCount
      },
      {
        label: "Lexique",
        value: lexiqueExplanationCount
      },
      {
        label: "liées au lemme",
        value: linkedExplanationCount
      },
      {
        label: "fiches Lexique seules",
        value: lexiqueOnlyExplanationCount
      }
    ],
    [lexiqueExplanationCount, lexiqueOnlyExplanationCount, linkedExplanationCount, wiktionaryExplanationCount]
  );
  const explanationsCountLabel = `${filteredWordExplanations.length.toLocaleString("fr-CH")} sur ${wordExplanations.length.toLocaleString("fr-CH")}`;
  const wordCheckResult = getWordCheckResult(wordCheckQuery);
  const previewAcceptedByOds = `${(LEXICON_PREVIEW.acceptedByOds8LocalRatio * 100).toLocaleString("fr-CH", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  })} %`;

  useEffect(() => {
    const initial = getExplanationSearchInitial(explanationQuery);

    if (initial) {
      onExplanationInitialRequested(initial);
    }
  }, [explanationQuery, onExplanationInitialRequested]);
  const previewOdsCoverage = `${(LEXICON_PREVIEW.ods8CoveredByPreviewLocalRatio * 100).toLocaleString("fr-CH", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  })} %`;

  return (
    <main className="rules-layout">
      <section className="rules-panel lexicon-panel" aria-labelledby="lexicon-title">
        <div className="rules-heading">
          <div>
            <p className="eyebrow">Dictionnaire</p>
            <h1 id="lexicon-title">Lexique de Sérénimot</h1>
          </div>
          <button type="button" onClick={onBack}>
            {hasGame ? "Retour à la partie" : "Retour"}
          </button>
        </div>

        <section className="lexicon-summary" aria-label="Résumé du lexique">
          <div>
            <strong>{SERENIMOT_LEXICON_VERSION}</strong>
            <span>version du lexique Sérénimot</span>
          </div>
          <div>
            <strong>{dictionarySize.toLocaleString("fr-CH")}</strong>
            <span>mots jouables</span>
          </div>
          <div>
            <strong>{previewAcceptedByOds}</strong>
            <span>compatibles avec la référence ODS 8 non intégrée</span>
          </div>
          <div>
            <strong>{previewOdsCoverage}</strong>
            <span>de couverture de la référence ODS 8 non intégrée</span>
          </div>
          <div>
            <strong>{explanationsStatus === "loading" ? "..." : explanationsSize.toLocaleString("fr-CH")}</strong>
            <span>{explanationsStatus === "ready" ? "fiches explicatives" : "fiches chargées"}</span>
          </div>
        </section>

        <section className="rules-section" aria-labelledby="lexicon-notice-title">
          <h2 id="lexicon-notice-title">À retenir</h2>
          <p>
            Sérénimot utilise {DICTIONARY_LABEL}, un dictionnaire local construit à partir de
            sources ouvertes. Sa version reprend la base {ORIGINAL_LEXICON_LABEL}, puis ajoute un
            numéro propre à Sérénimot qui devra augmenter à chaque nouvelle version du lexique.
          </p>
          <p>
            Ce dictionnaire n'est pas le dictionnaire officiel du Scrabble francophone. Certains
            mots rares peuvent donc être acceptés ou refusés différemment.
          </p>
        </section>

        <section className="rules-section lexicon-preview" aria-labelledby="lexicon-preview-title">
          <div className="lexicon-preview-heading">
            <div>
              <p className="eyebrow">{LEXICON_PREVIEW.statusLabel}</p>
              <h2 id="lexicon-preview-title">{LEXICON_PREVIEW.label}</h2>
            </div>
            <span className="lexicon-preview-badge">{LEXICON_PREVIEW.activeInApplication ? "Active" : "Non active"}</span>
          </div>
          <p>
            Cette version est maintenant chargée par le jeu. Le pipeline lexical continue en arrière-plan,
            notamment pour mieux documenter les mots courts rares.
          </p>
          <div className="lexicon-preview-stats" aria-label="Résumé du lexique">
            <div>
              <strong>{LEXICON_PREVIEW.wordsCount.toLocaleString("fr-CH")}</strong>
              <span>mots</span>
            </div>
            <div>
              <strong>{previewAcceptedByOds}</strong>
              <span>acceptés par la référence ODS 8 non intégrée</span>
            </div>
            <div>
              <strong>{previewOdsCoverage}</strong>
              <span>couverture de la référence ODS 8 non intégrée</span>
            </div>
            <div>
              <strong>{LEXICON_PREVIEW.shortWordExclusionsApplied}</strong>
              <span>petits mots exclus</span>
            </div>
          </div>
          <p className="lexicon-preview-hash">
            SHA-256 : <code>{LEXICON_PREVIEW.wordsSha256}</code>
          </p>
          <a className="lexicon-manifest-link" href={LEXICON_PREVIEW_MANIFEST_PATH} target="_blank" rel="noreferrer">
            Ouvrir le manifeste du lexique
          </a>
        </section>

        <section className="rules-section lexicon-download" aria-labelledby="lexicon-license-title">
          <div>
            <h2 id="lexicon-license-title">Licence et téléchargement</h2>
            <p>
              {DICTIONARY_LABEL} est proposé sous licence{" "}
              <a href={SERENIMOT_LEXICON_LICENSE_URL} target="_blank" rel="noreferrer">
                {SERENIMOT_LEXICON_LICENSE}
              </a>
              . Il est dérivé notamment de {ORIGINAL_LEXICON_SOURCE_LABEL}, puis enrichi par des
              traitements propres au projet Sérénimot.
            </p>
          </div>
          <a
            className="lexicon-download-button"
            href={DICTIONARY_FILE_PATH}
            download={`lexique-serenimot-${SERENIMOT_LEXICON_VERSION}.txt`}
          >
            Télécharger le lexique
          </a>
        </section>

        <section className="rules-section word-checker" aria-labelledby="word-checker-title">
          <h2 id="word-checker-title">Tester un mot</h2>
          <p>Vérifiez rapidement si un mot est reconnu par le lexique jouable actuel.</p>
          <div className="word-checker-form">
            <label htmlFor="word-check-query">Mot à vérifier</label>
            <input
              id="word-check-query"
              type="search"
              value={wordCheckQuery}
              onChange={(event) => setWordCheckQuery(event.target.value)}
              placeholder="Ex. DIAM, AMI, MM"
              autoCapitalize="characters"
              spellCheck={false}
            />
            <div
              className={`word-checker-result word-checker-result-${wordCheckResult.status}`}
              aria-live="polite"
            >
              <strong>{wordCheckResult.label}</strong>
              <span>{wordCheckResult.detail}</span>
            </div>
            {wordCheckResult.explanation ? (
              <article
                className="word-checker-explanation"
                aria-label={`Explication de ${wordCheckResult.normalizedWord}`}
              >
                <h3>{wordCheckResult.normalizedWord}</h3>
                <p>
                  <strong>{wordCheckResult.explanation.partOfSpeech}</strong> :{" "}
                  {formatWordExplanationDefinition(wordCheckResult.explanation)}
                </p>
                {wordCheckResult.explanation.usage ? <p>{wordCheckResult.explanation.usage}</p> : null}
              </article>
            ) : null}
          </div>
        </section>

        <section className="rules-section" aria-labelledby="lexicon-sources-title">
          <h2 id="lexicon-sources-title">Sources de travail</h2>
          <div className="lexicon-card-grid">
            {SOURCE_CARDS.map((source) => (
              <article className="lexicon-card" key={source.title}>
                <h3>
                  {"href" in source ? (
                    <a href={source.href} target="_blank" rel="noreferrer">
                      {source.title}
                    </a>
                  ) : (
                    source.title
                  )}
                </h3>
                <p>{source.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rules-grid">
          <article className="rules-section">
            <h2>Ce qui est filtré</h2>
            <ul>
              {FILTER_CARDS.map((filter) => (
                <li key={filter}>{filter}</li>
              ))}
            </ul>
          </article>

          <article className="rules-section">
            <h2>Dans le jeu</h2>
            <p>
              Quand un mot est refusé, cela signifie seulement qu'il n'est pas reconnu dans le
              dictionnaire actuel de Sérénimot. Le lexique continuera d'évoluer avec des règles
              documentées et vérifiables.
            </p>
            <p>
              Version affichée actuellement : <strong>{DICTIONARY_LABEL}</strong>.
            </p>
          </article>
        </section>

        <section className="rules-section" aria-labelledby="word-explanations-title">
          <h2 id="word-explanations-title">Sources des explications</h2>
          <p>
            Les explications affichées dans le jeu sont pré-calculées depuis les sources ouvertes.
            Les badges indiquent l'origine de chaque fiche. Elles peuvent contenir des erreurs ou
            des approximations, surtout pour les mots rares.
          </p>
          <div className="source-dashboard" aria-label="Résumé des sources des fiches explicatives">
            {sourceDashboardStats.map((stat) => (
              <div key={stat.label}>
                <strong>{stat.value.toLocaleString("fr-CH")}</strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
          <div className="word-explanation-search">
            <label htmlFor="word-explanation-query">Rechercher un mot</label>
            <input
              id="word-explanation-query"
              type="search"
              value={explanationQuery}
              onChange={(event) => setExplanationQuery(event.target.value)}
              placeholder="Ex. DIAM, QI, note, monnaie"
            />
            <span aria-live="polite">{explanationsCountLabel} fiches</span>
          </div>
          <div className="word-explanation-select-filters" aria-label="Filtres avancés des fiches">
            <label>
              <span>Longueur</span>
              <select
                value={explanationLengthFilter}
                onChange={(event) => setExplanationLengthFilter(event.target.value as ExplanationLengthFilter)}
              >
                {LENGTH_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Source</span>
              <select
                value={explanationSourceFilter}
                onChange={(event) => setExplanationSourceFilter(event.target.value as ExplanationSourceFilter)}
              >
                {SOURCE_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Type</span>
              <select
                value={explanationKindFilter}
                onChange={(event) => setExplanationKindFilter(event.target.value as ExplanationKindFilter)}
              >
                {KIND_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="word-explanation-grid">
            {displayedWordExplanations.map((entry) => (
              <article className="word-explanation-card" key={entry.word}>
                <div className="word-explanation-card-heading">
                  <h3>{entry.word}</h3>
                  <span className={getSourceBadgeClassName(entry)}>
                    {getPrimarySourceLabel(entry)}
                  </span>
                </div>
                <p>
                  <strong>{entry.partOfSpeech}</strong> : {formatWordExplanationDefinition(entry)}
                </p>
                <div className="word-explanation-tags" aria-label={`Sources et types pour ${entry.word}`}>
                  {getExplanationTags(entry).map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
                {entry.usage ? <p>{entry.usage}</p> : null}
              </article>
            ))}
          </div>
          {hiddenExplanationCount > 0 ? (
            <p className="word-explanation-limit">
              {hiddenExplanationCount.toLocaleString("fr-CH")} fiche
              {hiddenExplanationCount > 1 ? "s" : ""} masquée{hiddenExplanationCount > 1 ? "s" : ""}. Affinez les filtres ou la recherche.
            </p>
          ) : null}
          {filteredWordExplanations.length === 0 ? (
            <p className="word-explanation-empty">Aucune fiche ne correspond à cette recherche.</p>
          ) : null}
        </section>
      </section>
    </main>
  );
}

function getExplanationSearchInitial(query: string): string | null {
  const firstLetter = query
    .trim()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("fr-CH")
    .match(/[a-z]/)?.[0];

  return firstLetter ?? null;
}

function matchesLengthFilter(entry: WordExplanation, filter: ExplanationLengthFilter): boolean {
  return filter === "all" || entry.word.length === Number(filter);
}

function matchesSourceFilter(entry: WordExplanation, filter: ExplanationSourceFilter): boolean {
  if (filter === "wiktionary") {
    return hasWiktionarySource(entry);
  }

  if (filter === "lexique-only") {
    return isLexiqueOnlyExplanation(entry);
  }

  return true;
}

function matchesKindFilter(entry: WordExplanation, filter: ExplanationKindFilter): boolean {
  if (filter === "linked") {
    return Boolean(entry.baseWord);
  }

  if (filter === "plural") {
    return entry.partOfSpeech.toLocaleLowerCase("fr-CH").includes("pluriel") || entry.formNote?.startsWith("Pluriel de ") === true;
  }

  if (filter === "verb") {
    const partOfSpeech = entry.partOfSpeech.toLocaleLowerCase("fr-CH");
    return partOfSpeech.includes("verbe") || partOfSpeech.includes("participe");
  }

  return true;
}

function hasWiktionarySource(entry: WordExplanation): boolean {
  return entry.sources.some((source) => source.name === "Wiktionnaire");
}

function hasLexiqueSource(entry: WordExplanation): boolean {
  return entry.sources.some((source) => source.name === "Lexique");
}

function isLexiqueOnlyExplanation(entry: WordExplanation): boolean {
  return hasLexiqueSource(entry) && !hasWiktionarySource(entry);
}

function getPrimarySourceLabel(entry: WordExplanation): string {
  if (hasWiktionarySource(entry)) {
    return "Wiktionnaire";
  }

  if (hasLexiqueSource(entry)) {
    return "Lexique";
  }

  return entry.sources[0]?.name ?? "Source locale";
}

function getSourceBadgeClassName(entry: WordExplanation): string {
  return hasWiktionarySource(entry) ? "source-badge source-badge-wiktionary" : "source-badge source-badge-lexique";
}

function getExplanationTags(entry: WordExplanation): string[] {
  const tags = [];

  if (entry.baseWord) {
    tags.push(`lemme ${entry.baseWord}`);
  }
  if (hasWiktionarySource(entry)) {
    tags.push("Wiktionnaire");
  }
  if (hasLexiqueSource(entry)) {
    tags.push("Lexique");
  }
  if (matchesKindFilter(entry, "plural")) {
    tags.push("pluriel");
  }
  if (matchesKindFilter(entry, "verb")) {
    tags.push("verbe");
  }

  return tags;
}
