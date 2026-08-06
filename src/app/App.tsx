import { useCallback, useEffect, useRef, useState } from "react";
import { GameScreen } from "../components/game/GameScreen";
import { LexiconScreen } from "../components/game/LexiconScreen";
import { RulesScreen } from "../components/game/RulesScreen";
import { createNewGame } from "../domain/turns/game";
import type { OpponentLevel } from "../domain/turns/game";
import type { BoardSize, GameState } from "../domain/tiles/types";
import { DICTIONARY_LABEL, getDictionarySize, loadDictionaryFromUrl } from "../domain/rules/dictionary";
import {
  getKnownWordExplanations,
  loadWordExplanationsForInitials,
  loadWordExplanationsForLengths,
  WORD_EXPLANATION_INITIALS,
  WORD_EXPLANATION_LENGTHS
} from "../domain/rules/wordExplanations";
import { playGameMessageSound } from "../features/audio/gameSounds";
import { deleteSavedGame, loadSavedGame } from "../features/persistence/gameStorage";
import { DEFAULT_PREFERENCES, loadPreferences, savePreferences } from "../features/accessibility/preferences";

type Screen = "home" | "rules" | "lexicon" | "options" | "game";
type DictionaryStatus = "loading" | "ready" | "fallback";
type ExplanationsStatus = "idle" | "loading" | "partial" | "ready" | "fallback";
type TextScale = typeof DEFAULT_PREFERENCES.textScale;
type HintMode = typeof DEFAULT_PREFERENCES.hintMode;
type UndoMode = typeof DEFAULT_PREFERENCES.undoMode;
type ComputerSearchPreference = typeof DEFAULT_PREFERENCES.computerSearchProfile;
type VisualHintProps = {
  "aria-description": string;
  "data-tooltip"?: string;
};

const OPPONENT_LEVEL_OPTIONS: { value: OpponentLevel; label: string }[] = [
  { value: "very-easy", label: "Très facile" },
  { value: "easy", label: "Facile" },
  { value: "normal", label: "Normal" },
  { value: "hard", label: "Difficile" },
  { value: "expert", label: "Expert" }
];

const TEXT_SCALE_OPTIONS: { value: TextScale; label: string }[] = [
  { value: "ultra-small", label: "Ultra compacte" },
  { value: "extra-small", label: "Très compacte" },
  { value: "small", label: "Compacte" },
  { value: "standard", label: "Normale" },
  { value: "large", label: "Grande" },
  { value: "extra-large", label: "Très grande" }
];

const BOARD_SIZE_OPTIONS: { value: BoardSize; label: string }[] = [
  { value: 9, label: "9 × 9" },
  { value: 11, label: "11 × 11" },
  { value: 13, label: "13 × 13" },
  { value: 15, label: "15 × 15" },
  { value: 17, label: "17 × 17" }
];

const HINT_MODE_OPTIONS: { value: HintMode; label: string; description: string }[] = [
  { value: "none", label: "Pas d'indice", description: "Le bouton Indice est désactivé pendant la partie." },
  { value: "progressive", label: "Indice progressif", description: "Chaque appui révèle une aide supplémentaire." },
  { value: "complete", label: "Indice complet", description: "Un appui donne directement le meilleur mot trouvé." }
];

const UNDO_MODE_OPTIONS: { value: UndoMode; label: string; description: string }[] = [
  {
    value: "all-actions",
    label: "Toutes actions",
    description: "Ajoute Défaire pour revenir en arrière dans les actions de préparation, de pose et de validation."
  },
  {
    value: "off",
    label: "Désactivé",
    description: "Masque l'action Défaire pendant la partie."
  }
];

const COMPUTER_SEARCH_PROFILE_OPTIONS: { value: ComputerSearchPreference; label: string; description: string }[] = [
  {
    value: "auto",
    label: "Automatique",
    description: "Ajuste l'effort de recherche selon les temps observés sur cet appareil."
  },
  {
    value: "safe",
    label: "Prudent",
    description: "Réduit l'effort de recherche pour les appareils anciens ou lents."
  },
  {
    value: "balanced",
    label: "Équilibré",
    description: "Garde le comportement standard de l'ordinateur."
  },
  {
    value: "quality",
    label: "Qualité",
    description: "Autorise plus de recherche pour trouver de meilleurs coups."
  }
];
const GAME_EXPLANATION_LENGTHS = [2, 3, 4] as const;

function isWordExplanationInitial(value: string): value is (typeof WORD_EXPLANATION_INITIALS)[number] {
  return WORD_EXPLANATION_INITIALS.includes(value as (typeof WORD_EXPLANATION_INITIALS)[number]);
}

function getStandardTextScaleIndex(): number {
  const standardIndex = TEXT_SCALE_OPTIONS.findIndex((option) => option.value === "standard");

  return standardIndex === -1 ? 0 : standardIndex;
}

function getOpponentLevelLabel(level: OpponentLevel): string {
  return OPPONENT_LEVEL_OPTIONS.find((option) => option.value === level)?.label ?? OPPONENT_LEVEL_OPTIONS[0].label;
}

function getOpponentLevelDescription(level: OpponentLevel): string {
  if (level === "expert") {
    return "Explore beaucoup de possibilités et choisit le meilleur score trouvé.";
  }

  if (level === "hard") {
    return "Cherche davantage de coups et privilégie les meilleurs scores trouvés.";
  }

  if (level === "normal") {
    return "Cherche quelques bons coups, sans toujours choisir le meilleur.";
  }

  if (level === "easy") {
    return "Joue des coups modestes et limite les mots longs.";
  }

  return "Préfère des mots courts et joue vite, pour rester plus accessible.";
}

function getVisualHintProps(description: string, enabled: boolean): VisualHintProps {
  return enabled ? { "aria-description": description, "data-tooltip": description } : { "aria-description": description };
}

export function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [game, setGame] = useState<GameState | null>(null);
  const [hasSave, setHasSave] = useState(false);
  const [preferences, setPreferences] = useState(() => loadPreferences());
  const [dictionaryStatus, setDictionaryStatus] = useState<DictionaryStatus>("loading");
  const [dictionarySize, setDictionarySize] = useState(getDictionarySize());
  const [explanationsStatus, setExplanationsStatus] = useState<ExplanationsStatus>("idle");
  const [explanationsSize, setExplanationsSize] = useState(getKnownWordExplanations().length);
  const explanationsLoadPromise = useRef<Promise<number> | null>(null);
  const requestedExplanationInitials = useRef(new Set<(typeof WORD_EXPLANATION_INITIALS)[number]>());
  const loadedExplanationInitials = useRef(new Set<(typeof WORD_EXPLANATION_INITIALS)[number]>());
  const lastSoundMessageRef = useRef("");

  useEffect(() => {
    loadSavedGame()
      .then((savedGame) => setHasSave(Boolean(savedGame)))
      .catch(() => setHasSave(false));
    loadDictionaryFromUrl()
      .then((loadedSize) => {
        setDictionarySize(loadedSize);
        setDictionaryStatus("ready");
      })
      .catch(() => {
        setDictionarySize(getDictionarySize());
        setDictionaryStatus("fallback");
      });
  }, []);

  const loadWordExplanations = useCallback(
    (lengths: readonly (typeof WORD_EXPLANATION_LENGTHS)[number][], nextStatus: "partial" | "ready") => {
      if (explanationsStatus === "ready" || explanationsStatus === "loading" || explanationsStatus === "fallback") {
        return;
      }

      setExplanationsStatus("loading");
      explanationsLoadPromise.current = loadWordExplanationsForLengths(lengths);
      explanationsLoadPromise.current
        .then((loadedSize) => {
          explanationsLoadPromise.current = null;
          setExplanationsSize(loadedSize);
          setExplanationsStatus(nextStatus);
        })
        .catch(() => {
          explanationsLoadPromise.current = null;
          setExplanationsSize(getKnownWordExplanations().length);
          setExplanationsStatus("fallback");
        });
    },
    [explanationsStatus]
  );

  const ensureGameWordExplanationsLoaded = useCallback(() => {
    if (explanationsStatus !== "idle") {
      return;
    }

    loadWordExplanations(GAME_EXPLANATION_LENGTHS, "partial");
  }, [explanationsStatus, loadWordExplanations]);

  const requestWordExplanationsForInitial = useCallback((initial: string) => {
    const normalizedInitial = initial.toLocaleLowerCase("fr-CH");

    if (!isWordExplanationInitial(normalizedInitial)) {
      return;
    }

    if (
      explanationsStatus === "ready" ||
      explanationsStatus === "fallback" ||
      requestedExplanationInitials.current.has(normalizedInitial) ||
      loadedExplanationInitials.current.has(normalizedInitial)
    ) {
      return;
    }

    requestedExplanationInitials.current.add(normalizedInitial);
    setExplanationsStatus((currentStatus) =>
      currentStatus === "ready" || currentStatus === "fallback" ? currentStatus : "loading"
    );

    loadWordExplanationsForInitials([normalizedInitial])
      .then((loadedSize) => {
        loadedExplanationInitials.current.add(normalizedInitial);
        setExplanationsSize(loadedSize);
        setExplanationsStatus(
          WORD_EXPLANATION_INITIALS.every((letter) => loadedExplanationInitials.current.has(letter)) ? "ready" : "partial"
        );
      })
      .catch(() => {
        requestedExplanationInitials.current.delete(normalizedInitial);
        setExplanationsSize(getKnownWordExplanations().length);
        setExplanationsStatus("fallback");
      });
  }, [explanationsStatus]);

  useEffect(() => {
    savePreferences(preferences);
    document.documentElement.dataset.textScale = preferences.textScale;
    document.documentElement.dataset.contrast = preferences.contrast;
  }, [preferences]);

  useEffect(() => {
    if (screen === "game") {
      ensureGameWordExplanationsLoaded();
    }

  }, [ensureGameWordExplanationsLoaded, screen]);

  useEffect(() => {
    const message = game?.message;

    if (!message || !preferences.soundEnabled || message.text === lastSoundMessageRef.current) {
      return;
    }

    lastSoundMessageRef.current = message.text;
    playGameMessageSound(message, preferences.soundVolume);
  }, [game?.message, preferences.soundEnabled, preferences.soundVolume]);

  async function continueGame() {
    const savedGame = await loadSavedGame();
    if (savedGame) {
      ensureGameWordExplanationsLoaded();
      setGame(savedGame.state);
      setScreen("game");
    }
  }

  function startNewGame() {
    if (game && !window.confirm("Voulez-vous commencer une nouvelle partie ?")) {
      return;
    }

    const newGame = createNewGame({ boardSize: preferences.boardSize });
    ensureGameWordExplanationsLoaded();
    setGame(newGame);
    setHasSave(true);
    setScreen("game");
  }

  function changeBoardSize(nextBoardSize: BoardSize) {
    if (nextBoardSize === preferences.boardSize) {
      return;
    }

    const selectedOption = BOARD_SIZE_OPTIONS.find((option) => option.value === nextBoardSize);
    const selectedLabel = selectedOption?.label ?? `${nextBoardSize} × ${nextBoardSize}`;

    if (
      (game || hasSave) &&
      !window.confirm(
        `Changer la taille du plateau en ${selectedLabel} va lancer une nouvelle partie. Voulez-vous continuer ?`
      )
    ) {
      return;
    }

    const nextPreferences = { ...preferences, boardSize: nextBoardSize };
    setPreferences(nextPreferences);
    ensureGameWordExplanationsLoaded();
    setGame(createNewGame({ boardSize: nextBoardSize }));
    setHasSave(true);
    setScreen("game");
  }

  async function resetSave() {
    if (!window.confirm("Voulez-vous supprimer la partie enregistrée ?")) {
      return;
    }

    await deleteSavedGame();
    setGame(null);
    setHasSave(false);
    setScreen("home");
  }

  function updateTextScale(direction: -1 | 1) {
    const matchedIndex = TEXT_SCALE_OPTIONS.findIndex((option) => option.value === preferences.textScale);
    const currentIndex = matchedIndex === -1 ? getStandardTextScaleIndex() : matchedIndex;
    const nextIndex = Math.min(TEXT_SCALE_OPTIONS.length - 1, Math.max(0, currentIndex + direction));
    setPreferences({ ...preferences, textScale: TEXT_SCALE_OPTIONS[nextIndex].value });
  }

  const matchedTextScaleIndex = TEXT_SCALE_OPTIONS.findIndex((option) => option.value === preferences.textScale);
  const textScaleIndex = matchedTextScaleIndex === -1 ? getStandardTextScaleIndex() : matchedTextScaleIndex;
  const textScaleLabel = TEXT_SCALE_OPTIONS[textScaleIndex]?.label ?? TEXT_SCALE_OPTIONS[getStandardTextScaleIndex()].label;
  const optionHintProps = (description: string) => getVisualHintProps(description, preferences.hintsEnabled);

  if (screen === "rules") {
    return <RulesScreen hasGame={Boolean(game)} onBack={() => setScreen(game ? "game" : "home")} />;
  }

  if (screen === "lexicon") {
    return (
      <LexiconScreen
        dictionarySize={dictionarySize}
        explanationsSize={explanationsSize}
        explanationsStatus={explanationsStatus}
        hasGame={Boolean(game)}
        onExplanationInitialRequested={requestWordExplanationsForInitial}
        onBack={() => setScreen(game ? "game" : "home")}
      />
    );
  }

  if (screen === "options") {
    return (
      <main className="home-layout">
        <section className="home-panel options-panel" aria-labelledby="options-title">
          <p className="eyebrow">Options</p>
          <h1 id="options-title">Sérénimot</h1>
          <label
            className="setting-row"
            {...optionHintProps("Règle le niveau de jeu de l'ordinateur pour les prochaines parties.")}
          >
            <span>Niveau de l'ordinateur</span>
            <select
              value={preferences.opponentLevel}
              onChange={(event) => setPreferences({ ...preferences, opponentLevel: event.target.value as OpponentLevel })}
            >
              {OPPONENT_LEVEL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <p className="setting-help">
            {getOpponentLevelLabel(preferences.opponentLevel)} : {getOpponentLevelDescription(preferences.opponentLevel)}
          </p>
          <label
            className="setting-row"
            {...optionHintProps("Ajuste l'effort de recherche pour préserver la fluidité sur cet appareil.")}
          >
            <span>Performance ordinateur</span>
            <select
              value={preferences.computerSearchProfile}
              onChange={(event) =>
                setPreferences({
                  ...preferences,
                  computerSearchProfile: event.target.value as ComputerSearchPreference
                })
              }
            >
              {COMPUTER_SEARCH_PROFILE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <p className="setting-help">
            {
              COMPUTER_SEARCH_PROFILE_OPTIONS.find((option) => option.value === preferences.computerSearchProfile)
                ?.description
            }
          </p>
          <label
            className="setting-row"
            {...optionHintProps("Choisit si l'aide est absente, progressive ou complète pendant la partie.")}
          >
            <span>Indice</span>
            <select
              value={preferences.hintMode}
              onChange={(event) => setPreferences({ ...preferences, hintMode: event.target.value as HintMode })}
            >
              {HINT_MODE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <p className="setting-help">
            {HINT_MODE_OPTIONS.find((option) => option.value === preferences.hintMode)?.description}
          </p>
          <label
            className="setting-row"
            {...optionHintProps("Affiche ou masque les boutons pour défaire et refaire les actions.")}
          >
            <span>Retour arrière</span>
            <select
              value={preferences.undoMode}
              onChange={(event) => setPreferences({ ...preferences, undoMode: event.target.value as UndoMode })}
            >
              {UNDO_MODE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <p className="setting-help">
            {UNDO_MODE_OPTIONS.find((option) => option.value === preferences.undoMode)?.description}
          </p>
          {import.meta.env.DEV ? (
            <>
              <label
                className="setting-row checkbox-setting"
                {...optionHintProps("Affiche des informations techniques utiles pendant les tests.")}
              >
                <span>Mode dev</span>
                <input
                  type="checkbox"
                  checked={preferences.developerMode}
                  onChange={(event) => setPreferences({ ...preferences, developerMode: event.target.checked })}
                />
              </label>
              <p className="setting-help">
                Affiche les diagnostics de recherche, dont les temps du worker et du dictionnaire.
              </p>
            </>
          ) : null}
          <label
            className="setting-row checkbox-setting"
            {...optionHintProps("Active ou masque les bulles d'aide visuelles après un court survol ou focus.")}
          >
            <span>Bulles d'aide</span>
            <input
              type="checkbox"
              checked={preferences.hintsEnabled}
              onChange={(event) => setPreferences({ ...preferences, hintsEnabled: event.target.checked })}
            />
          </label>
          <p className="setting-help">
            Les descriptions restent disponibles pour l'accessibilité, même quand les bulles visuelles sont masquées.
          </p>
          <label
            className="setting-row"
            {...optionHintProps("Change le nombre de lignes et colonnes du plateau.")}
          >
            <span>Taille du plateau</span>
            <select
              value={preferences.boardSize}
              onChange={(event) => changeBoardSize(Number(event.target.value) as BoardSize)}
            >
              {BOARD_SIZE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <p className="setting-help">Changer la taille lance une nouvelle partie avec le nouveau plateau.</p>
          <div
            className="setting-row"
            {...optionHintProps("Agrandit ou réduit l'ensemble de l'interface.")}
          >
            <span id="options-interface-scale-label">Taille de l'interface</span>
            <div className="scale-control" aria-labelledby="options-interface-scale-label">
              <button
                className="secondary-button"
                type="button"
                onClick={() => updateTextScale(-1)}
                disabled={textScaleIndex <= 0}
                aria-label="Réduire l'interface"
              >
                -
              </button>
              <strong aria-live="polite">{textScaleLabel}</strong>
              <button
                className="secondary-button"
                type="button"
                onClick={() => updateTextScale(1)}
                disabled={textScaleIndex >= TEXT_SCALE_OPTIONS.length - 1}
                aria-label="Agrandir l'interface"
              >
                +
              </button>
              <button
                className="secondary-button scale-reset"
                type="button"
                onClick={() => setPreferences({ ...preferences, textScale: "standard" })}
                disabled={preferences.textScale === "standard"}
              >
                Réinitialiser
              </button>
            </div>
          </div>
          <label
            className="setting-row"
            {...optionHintProps("Renforce le contraste visuel des éléments principaux.")}
          >
            <span>Contraste</span>
            <select
              value={preferences.contrast}
              onChange={(event) =>
                setPreferences({ ...preferences, contrast: event.target.value as typeof preferences.contrast })
              }
            >
              <option value="standard">Standard</option>
              <option value="enhanced">Renforcé</option>
            </select>
          </label>
          <label
            className="setting-row checkbox-setting"
            {...optionHintProps("Active ou coupe les sons du jeu.")}
          >
            <span>Sons</span>
            <input
              type="checkbox"
              checked={preferences.soundEnabled}
              onChange={(event) => setPreferences({ ...preferences, soundEnabled: event.target.checked })}
            />
          </label>
          <p className="setting-help">Ajoute de petits sons pour les coups acceptés, les alertes et le tour de l'ordinateur.</p>
          {preferences.soundEnabled ? (
            <label
              className="setting-row range-setting"
              {...optionHintProps("Règle le volume des sons du jeu.")}
            >
              <span>Volume</span>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={preferences.soundVolume}
                onChange={(event) => setPreferences({ ...preferences, soundVolume: Number(event.target.value) })}
              />
              <strong aria-live="polite">{preferences.soundVolume}%</strong>
            </label>
          ) : null}
          <div className="home-actions">
            <button
              type="button"
              onClick={() => setScreen(game ? "game" : "home")}
              {...optionHintProps("Revient à l'écran précédent.")}
            >
              Retour
            </button>
            {hasSave ? (
              <button
                className="secondary-button"
                type="button"
                onClick={resetSave}
                {...optionHintProps("Supprime la partie sauvegardée localement après confirmation.")}
              >
                Supprimer la sauvegarde
              </button>
            ) : null}
          </div>
        </section>
      </main>
    );
  }

  if (screen === "game" && game) {
    return (
      <GameScreen
        game={game}
        onGameChange={(nextGame) => {
          setGame(nextGame);
          setHasSave(true);
        }}
        onNewGameRequest={startNewGame}
        onRulesRequest={() => setScreen("rules")}
        onLexiconRequest={() => setScreen("lexicon")}
        onOptionsRequest={() => setScreen("options")}
        onExplanationInitialRequested={requestWordExplanationsForInitial}
        interfaceScaleLabel={textScaleLabel}
        opponentLevel={preferences.opponentLevel}
        computerSearchProfile={preferences.computerSearchProfile}
        hintMode={preferences.hintMode}
        undoMode={preferences.undoMode}
        hintsEnabled={preferences.hintsEnabled}
        developerMode={preferences.developerMode}
        canDecreaseInterfaceScale={textScaleIndex > 0}
        canIncreaseInterfaceScale={textScaleIndex < TEXT_SCALE_OPTIONS.length - 1}
        onDecreaseInterfaceScale={() => updateTextScale(-1)}
        onIncreaseInterfaceScale={() => updateTextScale(1)}
      />
    );
  }

  return (
    <main className="home-layout">
      <section className="home-panel" aria-labelledby="home-title">
        <p className="eyebrow">Les mots, à votre rythme.</p>
        <h1 id="home-title">Sérénimot</h1>
        <p>Un jeu original de lettres croisées sur grille, sans compte et sans chronomètre.</p>
        <div className="home-actions">
          <button type="button" onClick={continueGame} disabled={!hasSave || dictionaryStatus === "loading"}>
            Continuer
          </button>
          <button type="button" onClick={startNewGame} disabled={dictionaryStatus === "loading"}>
            Nouvelle partie
          </button>
          <button type="button" onClick={() => setScreen("options")}>
            Options
          </button>
          <button type="button" onClick={() => setScreen("rules")}>
            Règles
          </button>
          <button
            type="button"
            onClick={() => setScreen("lexicon")}
          >
            Lexique
          </button>
        </div>
        <p className="dictionary-status">
          {dictionaryStatus === "loading"
            ? "Chargement du dictionnaire..."
            : dictionaryStatus === "ready"
              ? `Dictionnaire chargé : ${dictionarySize.toLocaleString("fr-CH")} mots, ${DICTIONARY_LABEL}.`
              : `Dictionnaire complet indisponible : base minimale active (${dictionarySize.toLocaleString("fr-CH")} mots).`}
        </p>
        <p className="dictionary-status">
          {explanationsStatus === "idle"
            ? `${explanationsSize.toLocaleString("fr-CH")} fiches essentielles intégrées. Les explications complètes seront chargées à la demande.`
            : explanationsStatus === "loading"
            ? "Chargement des explications..."
            : explanationsStatus === "partial"
              ? `${explanationsSize.toLocaleString("fr-CH")} fiches chargées. Les autres seront chargées à la demande.`
            : explanationsStatus === "ready"
              ? `${explanationsSize.toLocaleString("fr-CH")} fiches explicatives disponibles.`
              : `Explications complètes indisponibles : ${explanationsSize.toLocaleString("fr-CH")} fiches intégrées actives.`}
        </p>
      </section>
    </main>
  );
}
