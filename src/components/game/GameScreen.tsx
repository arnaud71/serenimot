import { useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent } from "react";
import { BoardView } from "./BoardView";
import type { BoardBonusAnimationCell, BoardFloatingWord, BoardPreviewCell, BoardScorePreview } from "./BoardView";
import { RackView } from "./RackView";
import type { BestMoveHint } from "../../domain/turns/hints";
import {
  findBestHumanMoveAsync,
  getLastSearchWorkerMetrics,
  playComputerTurnAsync,
  prewarmSearchWorker
} from "../../domain/turns/searchWorkerClient";
import type { SearchWorkerMetrics } from "../../domain/turns/searchWorkerClient";
import {
  passHumanTurn,
  createBoardTileToken,
  exchangeHumanTiles,
  isGameFinished,
  placeTile,
  placeWord,
  recordHumanHintUse,
  removeHumanTurnTile,
  undoHumanTurn,
  validatePreparedHint,
  validateHumanTurn
} from "../../domain/turns/game";
import type { PlacementDirection } from "../../domain/turns/game";
import type { ComputerSearchProfile, OpponentLevel } from "../../domain/turns/game";
import { getBoardCenter } from "../../domain/tiles/types";
import type { GameState, PlacedTile, PlayerId, ScoreDetails, ScoreLetterDetail, Tile } from "../../domain/tiles/types";
import { getPlacedTiles, validateTurn } from "../../domain/rules/validation";
import { explainTurnScore } from "../../domain/scoring/scoring";
import { DICTIONARY_LABEL, getDictionarySize } from "../../domain/rules/dictionary";
import { formatWordExplanationDefinition, getWordExplanation } from "../../domain/rules/wordExplanations";
import type { WordExplanation } from "../../domain/rules/wordExplanations";
import { saveGame } from "../../features/persistence/gameStorage";

type GameScreenProps = {
  game: GameState;
  onGameChange: (state: GameState) => void;
  onNewGameRequest: () => void;
  onRulesRequest: () => void;
  onLexiconRequest: () => void;
  onOptionsRequest: () => void;
  onExplanationInitialRequested: (initial: string) => void;
  interfaceScaleLabel: string;
  opponentLevel: OpponentLevel;
  computerSearchProfile: "auto" | ComputerSearchProfile;
  hintMode: "none" | "progressive" | "complete";
  undoMode: "turn-only" | "all-actions";
  hintsEnabled: boolean;
  developerMode: boolean;
  canDecreaseInterfaceScale: boolean;
  canIncreaseInterfaceScale: boolean;
  onDecreaseInterfaceScale: () => void;
  onIncreaseInterfaceScale: () => void;
};

const TILE_DRAG_MIME = "text/serenimot-tile-id";
const HINT_SEARCH_DELAY_MS = 850;
const COMPUTER_THINKING_DELAY_MS = 1200;
const COMPUTER_AUTO_PROFILE_SAMPLE_SIZE = 4;
const MAX_HINT_LEVEL = 6;
const PREPARED_SLOT_COUNT = 9;
const UNDO_HISTORY_LIMIT = 30;
const PLACEMENT_DIRECTIONS: PlacementDirection[] = ["row", "col"];

type HintLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6;

type SearchDiagnostic = {
  label: string;
  profile?: ComputerSearchProfile;
  metrics: SearchWorkerMetrics;
};

const OPPONENT_LEVEL_LABELS: Record<OpponentLevel, string> = {
  "very-easy": "Très facile",
  easy: "Facile",
  normal: "Normal",
  hard: "Difficile",
  expert: "Expert"
};

type SelectedBoardCell = {
  row: number;
  col: number;
};

type ContextualHelp = {
  title: string;
  items: string[];
  note?: string;
};

type ContextualHelpParams = {
  canValidate: boolean;
  dictionaryWordCount: string;
  displayedPreparedWord: string;
  game: GameState;
  hintLevel: HintLevel;
  isExchangeMode: boolean;
  isFinished: boolean;
  isHintSearching: boolean;
  pendingScoreDetails: ScoreDetails | null;
  pendingTurnWord: BoardFloatingWord | null;
  selectedBoardCell: SelectedBoardCell | null;
  selectedExchangeTileIds: string[];
  selectedPreparedSlotIndex: number | null;
  selectedTile: Tile | null;
  usesProgressiveHints: boolean;
};

type UndoSnapshot = {
  game: GameState;
  preparedTileSlots: (string | null)[];
  selectedTileId: string | null;
  selectedBoardCell: SelectedBoardCell | null;
  hint: BestMoveHint | null;
  hintLevel: HintLevel;
  isPendingWordSelected: boolean;
  errorPreviewCells: BoardPreviewCell[];
  invalidCellKeys: string[];
  floatingScorePreview: number | null;
};

export function GameScreen({
  game,
  onGameChange,
  onNewGameRequest,
  onRulesRequest,
  onLexiconRequest,
  onOptionsRequest,
  onExplanationInitialRequested,
  interfaceScaleLabel,
  opponentLevel,
  computerSearchProfile,
  hintMode,
  undoMode,
  hintsEnabled,
  developerMode,
  canDecreaseInterfaceScale,
  canIncreaseInterfaceScale,
  onDecreaseInterfaceScale,
  onIncreaseInterfaceScale
}: GameScreenProps) {
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [selectedBoardCell, setSelectedBoardCell] = useState<SelectedBoardCell | null>(null);
  const [preparedTileSlots, setPreparedTileSlots] = useState<(string | null)[]>(() => createEmptyPreparedSlots());
  const [selectedPreparedSlotIndex, setSelectedPreparedSlotIndex] = useState<number | null>(null);
  const [isKeyboardPreparationEntryActive, setIsKeyboardPreparationEntryActive] = useState(false);
  const [hint, setHint] = useState<BestMoveHint | null>(null);
  const [hintLevel, setHintLevel] = useState<HintLevel>(0);
  const [undoHistory, setUndoHistory] = useState<UndoSnapshot[]>([]);
  const [redoHistory, setRedoHistory] = useState<UndoSnapshot[]>([]);
  const [errorPreviewCells, setErrorPreviewCells] = useState<BoardPreviewCell[]>([]);
  const [invalidCellKeys, setInvalidCellKeys] = useState<string[]>([]);
  const [isPendingWordSelected, setIsPendingWordSelected] = useState(false);
  const [floatingScorePreview, setFloatingScorePreview] = useState<number | null>(null);
  const [computerMoveCellKeys, setComputerMoveCellKeys] = useState<string[]>([]);
  const [bonusAnimationCells, setBonusAnimationCells] = useState<BoardBonusAnimationCell[]>([]);
  const [isHintSearching, setIsHintSearching] = useState(false);
  const [isBoardRecenterVisible, setIsBoardRecenterVisible] = useState(false);
  const [searchDiagnostic, setSearchDiagnostic] = useState<SearchDiagnostic | null>(null);
  const [isExchangeMode, setIsExchangeMode] = useState(false);
  const [selectedExchangeTileIds, setSelectedExchangeTileIds] = useState<string[]>([]);
  const [dismissedGameOverId, setDismissedGameOverId] = useState<string | null>(null);
  const [isMobileTopbarCollapsed, setIsMobileTopbarCollapsed] = useState(true);
  const hintSearchTimeoutRef = useRef<number | null>(null);
  const hintSearchRequestIdRef = useRef(0);
  const computerSearchRequestIdRef = useRef(0);
  const computerSearchDurationsRef = useRef<number[]>([]);
  const gameIdRef = useRef(game.gameId);
  const boardSectionRef = useRef<HTMLElement | null>(null);
  const boardRecenterFrameRef = useRef<number | null>(null);
  const isFinished = isGameFinished(game);
  const finalStatus = game.status?.state === "finished" ? game.status : null;
  const dictionaryWordCount = getDictionarySize().toLocaleString("fr-CH");
  const selectedTile = useMemo(
    () => game.racks.human.find((tile) => tile.id === selectedTileId) ?? null,
    [game.racks.human, selectedTileId]
  );
  const preparedTileIds = useMemo(() => getPreparedSlotTileIds(preparedTileSlots), [preparedTileSlots]);
  const preparedTileDetails = useMemo(
    () => preparedTileIds.map((tileId) => getPreparedTile(game, tileId)).filter((tile): tile is Tile => Boolean(tile)),
    [game, preparedTileIds]
  );
  const preparedTileSlotDetails = useMemo(
    () => preparedTileSlots.map((tileId) => (tileId ? getPreparedTile(game, tileId) : null)),
    [game, preparedTileSlots]
  );
  const preparedTiles = preparedTileDetails.map((tile) => tile.letter);
  const preparedWord = preparedTiles.join("");
  const pendingTurnWord = useMemo(() => getPendingTurnWord(game), [game]);
  const pendingWordStartCellKey =
    pendingTurnWord?.row !== undefined && pendingTurnWord.col !== undefined
      ? `${pendingTurnWord.row}:${pendingTurnWord.col}`
      : null;
  const scoreWordInitials = useMemo(
    () =>
      uniqueStrings(
        (game.message.scoreDetails?.words ?? [])
          .map((word) => getWordInitial(word.word))
          .filter((initial): initial is string => Boolean(initial))
      ),
    [game.message.scoreDetails]
  );
  const usesProgressiveHints = hintMode === "progressive";
  const usesFullUndoMode = undoMode === "all-actions";
  const isCompleteHintVisible = Boolean(hint && hintLevel >= 6);
  const isPartialHintVisible = Boolean(hint && hintLevel > 0 && hintLevel < MAX_HINT_LEVEL);
  const displayedPreparedWord = isCompleteHintVisible ? hint?.word ?? "" : preparedWord;
  const preparedBoardTileKeys = preparedTileIds
    .map((tileId) => parseBoardTileKey(tileId))
    .filter((key): key is string => Boolean(key));
  const preparedPlacement = useMemo(
    () =>
      isPartialHintVisible
        ? null
        : findPreparedPlacement(game, preparedTileIds, preparedWord, isCompleteHintVisible),
    [game, isCompleteHintVisible, isPartialHintVisible, preparedTileIds, preparedWord]
  );
  const preparedPreviewCells = hasCommittedTileOnBoard(game) ? (preparedPlacement?.previewCells ?? []) : [];
  const floatingPreparedWord = null;
  const pendingScoreDetails = useMemo(() => getPendingScoreDetails(game), [game]);
  const previewScoreDetails = hint && hintLevel >= 4 ? hint.scoreDetails : pendingScoreDetails;
  const pendingNewWordCellKeys = useMemo(() => {
    if (hint && hintLevel < MAX_HINT_LEVEL) {
      return [];
    }

    return getScoreWordCellKeys(previewScoreDetails);
  }, [hint, hintLevel, previewScoreDetails]);
  const hintAreaCellKeys = useMemo(() => [], []);
  const isPositionedPartialHintVisible = Boolean(hint && hintLevel >= 4 && hintLevel < MAX_HINT_LEVEL);
  const hintAnchorCellKeys = useMemo(
    () => (hint && isPositionedPartialHintVisible ? getHintPositionedBoardClueCellKeys(hint) : []),
    [hint, isPositionedPartialHintVisible]
  );
  const hintPositionCellKeys = useMemo(
    () =>
      hint && isPositionedPartialHintVisible
        ? getHintPositionedClueCellKeys(hint)
        : hint && hintLevel >= MAX_HINT_LEVEL
          ? getHintCellKeys(hint)
          : [],
    [hint, hintLevel, isPositionedPartialHintVisible]
  );
  const hintPreviewCells = useMemo(() => (hint ? getHintPreviewCells(game, hint, hintLevel) : []), [game, hint, hintLevel]);
  const lastMoveCellKeys = useMemo(
    () => getLastMoveCellKeys(game.message.scoreDetails ?? null, game.message.text),
    [game.message.scoreDetails, game.message.text]
  );
  const boardScorePreview = useMemo(
    () => getBoardScorePreview(previewScoreDetails),
    [previewScoreDetails]
  );
  const canValidate = useMemo(
    () => canValidateCurrentMove(game, isCompleteHintVisible ? hint : null),
    [game, hint, isCompleteHintVisible]
  );
  const isHintDisabled = isFinished || game.turn.player !== "human" || isHintSearching || hintMode === "none";
  const hasPreparedActivity = preparedTileIds.length > 0 || Boolean(pendingTurnWord);
  const canUndoAction = undoHistory.length > 0 && (usesFullUndoMode || hasPreparedActivity);
  const canRedoAction = redoHistory.length > 0 && (usesFullUndoMode || game.turn.player === "human");
  const canUseExchangeMode = !isFinished && game.turn.player === "human" && game.bag.length > 0;
  const exchangeButtonLabel =
    isExchangeMode && selectedExchangeTileIds.length > 0
      ? `Échanger (${selectedExchangeTileIds.length})`
      : "Échanger";
  const exchangeButtonHint = isExchangeMode
    ? "Remplace les lettres choisies et passe votre tour."
    : "Choisit des lettres à remplacer, puis passe votre tour.";
  const contextualHelp = getContextualHelp({
    canValidate,
    dictionaryWordCount,
    displayedPreparedWord,
    game,
    hintLevel,
    isExchangeMode,
    isFinished,
    isHintSearching,
    pendingScoreDetails,
    pendingTurnWord,
    selectedBoardCell,
    selectedExchangeTileIds,
    selectedPreparedSlotIndex,
    selectedTile,
    usesProgressiveHints
  });

  function setPreparedTileIds(nextTileIds: string[] | ((currentTileIds: string[]) => string[])) {
    setPreparedTileSlots((currentSlots) => {
      const currentTileIds = getPreparedSlotTileIds(currentSlots);
      const tileIds = typeof nextTileIds === "function" ? nextTileIds(currentTileIds) : nextTileIds;

      return packPreparedTileSlots(tileIds);
    });
  }

  function pushUndoPoint() {
    if (isFinished) {
      return;
    }

    setUndoHistory((currentHistory) => [...currentHistory.slice(-(UNDO_HISTORY_LIMIT - 1)), createUndoSnapshot()]);
    setRedoHistory([]);
  }

  function clearUndoHistory() {
    setUndoHistory([]);
    setRedoHistory([]);
  }

  function clearPreparedDestinationSelection() {
    setSelectedBoardCell(null);
    setSelectedPreparedSlotIndex(null);
    setIsKeyboardPreparationEntryActive(false);
  }

  function createUndoSnapshot(): UndoSnapshot {
    return {
      game: cloneGameState(game),
      preparedTileSlots: [...preparedTileSlots],
      selectedTileId,
      selectedBoardCell,
      hint: cloneHint(hint),
      hintLevel,
      isPendingWordSelected,
      errorPreviewCells: cloneBoardPreviewCells(errorPreviewCells),
      invalidCellKeys: [...invalidCellKeys],
      floatingScorePreview
    };
  }

  function restoreUndoSnapshot(snapshot: UndoSnapshot, message: string) {
    const restoredGame = cloneGameState(snapshot.game);
    const shouldKeepSnapshotMessage =
      snapshot.errorPreviewCells.length > 0 || snapshot.invalidCellKeys.length > 0 || snapshot.floatingScorePreview !== null;

    setSelectedTileId(snapshot.selectedTileId);
    setSelectedBoardCell(snapshot.selectedBoardCell);
    setPreparedTileSlots(snapshot.preparedTileSlots);
    setIsKeyboardPreparationEntryActive(false);
    setIsPendingWordSelected(snapshot.isPendingWordSelected);
    setHint(snapshot.hint);
    setHintLevel(snapshot.hintLevel);
    setErrorPreviewCells(cloneBoardPreviewCells(snapshot.errorPreviewCells));
    setInvalidCellKeys([...snapshot.invalidCellKeys]);
    setFloatingScorePreview(snapshot.floatingScorePreview);
    setIsExchangeMode(false);
    setSelectedExchangeTileIds([]);
    onGameChange({
      ...restoredGame,
      message: shouldKeepSnapshotMessage
        ? restoredGame.message
        : {
            tone: "info",
            text: message
          }
    });
  }

  useEffect(() => {
    saveGame(game).catch(() => {
      // A visible save failure state can be added once the first prototype is stable.
    });
  }, [game]);

  useEffect(() => {
    if (gameIdRef.current === game.gameId) {
      return;
    }

    gameIdRef.current = game.gameId;
    clearUndoHistory();
    setPreparedTileSlots(createEmptyPreparedSlots());
    setSelectedTileId(null);
    setSelectedBoardCell(null);
    setSelectedPreparedSlotIndex(null);
    setIsKeyboardPreparationEntryActive(false);
    setIsExchangeMode(false);
    setSelectedExchangeTileIds([]);
    clearHint();
    clearErrorHighlights();
  }, [game.gameId]);

  useEffect(() => {
    const availableTileIds = new Set(game.racks.human.map((tile) => tile.id));

    setSelectedExchangeTileIds((currentTileIds) =>
      currentTileIds.filter((tileId) => availableTileIds.has(tileId) && !preparedTileIds.includes(tileId))
    );

    if (isFinished || game.turn.player !== "human" || game.bag.length === 0) {
      setIsExchangeMode(false);
    }
  }, [game.bag.length, game.racks.human, game.turn.player, isFinished, preparedTileIds]);

  useEffect(() => {
    setPreparedTileSlots((currentSlots) => sanitizePreparedTileSlots(currentSlots, game));
  }, [game]);

  useEffect(
    () => () => {
      if (hintSearchTimeoutRef.current !== null) {
        window.clearTimeout(hintSearchTimeoutRef.current);
      }
      if (boardRecenterFrameRef.current !== null) {
        window.cancelAnimationFrame(boardRecenterFrameRef.current);
      }
      hintSearchRequestIdRef.current += 1;
      computerSearchRequestIdRef.current += 1;
    },
    []
  );

  useEffect(() => {
    function handleWindowKeyDown(event: KeyboardEvent) {
      const shouldHandleDelete =
        (event.key === "Backspace" || event.key === "Delete") &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        !isTextEntryTarget(event.target);

      if (shouldHandleDelete) {
        const didHandleDelete = handleKeyboardDeleteEntry();

        if (didHandleDelete) {
          event.preventDefault();
        }

        return;
      }

      const letter = getKeyboardLetter(event);

      if (!letter || event.ctrlKey || event.metaKey || event.altKey || isTextEntryTarget(event.target)) {
        return;
      }

      const didHandleLetter = handleKeyboardLetterEntry(letter);

      if (didHandleLetter) {
        event.preventDefault();
      }
    }

    window.addEventListener("keydown", handleWindowKeyDown);

    return () => {
      window.removeEventListener("keydown", handleWindowKeyDown);
    };
  });

  useEffect(() => {
    const updateBoardVisibility = () => {
      boardRecenterFrameRef.current = null;
      const boardSection = boardSectionRef.current;

      if (!boardSection) {
        return;
      }

      const rect = boardSection.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const shouldShow = rect.bottom < viewportHeight * 0.45 || rect.top > viewportHeight * 0.6;

      setIsBoardRecenterVisible(shouldShow);
    };

    const scheduleBoardVisibilityUpdate = () => {
      if (boardRecenterFrameRef.current !== null) {
        return;
      }

      boardRecenterFrameRef.current = window.requestAnimationFrame(updateBoardVisibility);
    };

    updateBoardVisibility();
    window.addEventListener("scroll", scheduleBoardVisibilityUpdate, { passive: true });
    window.addEventListener("resize", scheduleBoardVisibilityUpdate);

    return () => {
      window.removeEventListener("scroll", scheduleBoardVisibilityUpdate);
      window.removeEventListener("resize", scheduleBoardVisibilityUpdate);
      if (boardRecenterFrameRef.current !== null) {
        window.cancelAnimationFrame(boardRecenterFrameRef.current);
        boardRecenterFrameRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    void prewarmSearchWorker().then(() => {
      const metrics = getLastSearchWorkerMetrics();

      if (metrics) {
        setSearchDiagnostic({
          label: "Préchauffage",
          metrics
        });
      }
    });
  }, []);

  useEffect(() => {
    const initial = getWordInitial(preparedWord || pendingTurnWord?.word || "");

    if (initial) {
      onExplanationInitialRequested(initial);
    }
  }, [onExplanationInitialRequested, pendingTurnWord, preparedWord]);

  useEffect(() => {
    scoreWordInitials.forEach((initial) => onExplanationInitialRequested(initial));
  }, [onExplanationInitialRequested, scoreWordInitials]);

  useEffect(() => {
    if (!game.message.scoreDetails || !game.message.text.startsWith("Le robot pose")) {
      return;
    }

    const newComputerCellKeys = getNewScoreWordCellKeys(game.message.scoreDetails);

    if (newComputerCellKeys.length === 0) {
      return;
    }

    setComputerMoveCellKeys(newComputerCellKeys);
    const timeout = window.setTimeout(() => setComputerMoveCellKeys([]), 3600);

    return () => window.clearTimeout(timeout);
  }, [game.message.scoreDetails, game.message.text]);

  useEffect(() => {
    if (!game.message.scoreDetails) {
      setBonusAnimationCells([]);
      return;
    }

    const nextBonusAnimationCells = getBonusAnimationCells(game.message.scoreDetails);

    if (nextBonusAnimationCells.length === 0) {
      setBonusAnimationCells([]);
      return;
    }

    setBonusAnimationCells(nextBonusAnimationCells);
    const timeout = window.setTimeout(() => setBonusAnimationCells([]), 3600);

    return () => window.clearTimeout(timeout);
  }, [game.message.scoreDetails]);

  useEffect(() => {
    if (isFinished || game.turn.player !== "computer") {
      return;
    }

    const requestId = computerSearchRequestIdRef.current + 1;
    computerSearchRequestIdRef.current = requestId;

    const timeout = window.setTimeout(() => {
      const effectiveProfile = getEffectiveComputerSearchProfile(
        computerSearchProfile,
        computerSearchDurationsRef.current
      );
      const searchStartedAt = performance.now();
      void playComputerTurnAsync(game, opponentLevel, { profile: effectiveProfile })
        .then((nextGame) => {
          if (computerSearchRequestIdRef.current !== requestId) {
            return;
          }

          const metrics = getLastSearchWorkerMetrics();
          if (metrics) {
            setSearchDiagnostic({
              label: "Robot",
              profile: effectiveProfile,
              metrics
            });
          }

          computerSearchDurationsRef.current = [
            ...computerSearchDurationsRef.current.slice(-(COMPUTER_AUTO_PROFILE_SAMPLE_SIZE - 1)),
            performance.now() - searchStartedAt
          ];
          onGameChange(nextGame);
        })
        .catch(() => {
          if (computerSearchRequestIdRef.current !== requestId) {
            return;
          }

          onGameChange({
            ...game,
            turn: {
              player: "human",
              placedTileIds: []
            },
            message: {
              tone: "notice",
              text: "Le robot n'a pas réussi à jouer. À vous de reprendre la main."
            }
          });
        });
    }, COMPUTER_THINKING_DELAY_MS);

    return () => {
      window.clearTimeout(timeout);
      if (computerSearchRequestIdRef.current === requestId) {
        computerSearchRequestIdRef.current += 1;
      }
    };
  }, [computerSearchProfile, game, isFinished, onGameChange, opponentLevel]);

  function handleCellClick(row: number, col: number) {
    if (isFinished) {
      return;
    }

    const cellTile = game.board[row][col].tile;

    clearErrorHighlights();
    if (cellTile && !cellTile.committed && cellTile.owner === "human" && pendingTurnWord) {
      clearHint();

      const result = movePendingHumanTiles(game, row, col, pendingTurnWord.direction);
      pushUndoPoint();

      if (!result.ok) {
        onGameChange({
          ...result.state,
          message: {
            tone: "notice",
            text: `${result.reason} La suite de lettres n'a pas été déplacée.`
          }
        });
        setSelectedTileId(null);
        return;
      }

      const nextPendingTurnWord = getPendingTurnWord(result.state);

      setSelectedTileId(null);
      setSelectedPreparedSlotIndex(null);
      setIsKeyboardPreparationEntryActive(false);
      setIsPendingWordSelected(false);
      setSelectedBoardCell(getAppendCellForPendingWord(result.state, nextPendingTurnWord));
      onGameChange({
        ...result.state,
        message: {
          tone: "info",
          text: "La suite de lettres a été déplacée. Vous pouvez encore la modifier avant de valider."
        }
      });
      return;
    }

    if (cellTile?.committed && !hint) {
      const boardToken = createBoardTileToken(row, col);
      const boardTokenIndex = preparedTileIds.indexOf(boardToken);
      if (preparedTileIds.length > 0) {
        setSelectedTileId(null);
        if (boardTokenIndex >= 0) {
          pushUndoPoint();
          setPreparedTileSlots((currentSlots) => removeTileIdFromPreparedSlots(currentSlots, boardToken));
          return;
        }

        const nextSlots = placeTileIdInPreparedSlot(
          preparedTileSlots,
          boardToken,
          getFirstEmptySlotIndex(preparedTileSlots),
          game
        );
        const nextTileIds = getPreparedSlotTileIds(nextSlots);
        const nextWord = getPreparedWordFromTileIds(game, nextTileIds);
        const autoPlacement = findPreparedPlacement(game, nextTileIds, nextWord, false);

        if (autoPlacement) {
          const result = placeWord(game, nextTileIds, autoPlacement.row, autoPlacement.col, autoPlacement.direction);

          if (result.ok) {
            pushUndoPoint();
            setPreparedTileSlots(nextSlots);
            setIsPendingWordSelected(false);
            onGameChange(result.state);
            return;
          }
        }

        pushUndoPoint();
        setPreparedTileSlots(nextSlots);
        return;
      }

      if (preparedTileIds.length === 0) {
        pushUndoPoint();
        setSelectedTileId(null);
        setPreparedTileIds([boardToken]);
        return;
      }
    }

    if (pendingTurnWord && !selectedTileId && !cellTile && preparedTileIds.length === 0) {
      const result = movePendingHumanTiles(game, row, col, pendingTurnWord.direction);

      clearHint();
      clearErrorHighlights();
      pushUndoPoint();

      if (!result.ok) {
        const attemptedCells = buildAttemptPreviewCells(game, pendingTurnWord.word, row, col, pendingTurnWord.direction);
        setErrorPreviewCells(attemptedCells);
        setInvalidCellKeys(attemptedCells.map((cell) => `${cell.row}:${cell.col}`));
        onGameChange({
          ...result.state,
          message: {
            tone: "notice",
            text: `${result.reason} La suite de lettres n'a pas été déplacée.`
          }
        });
        return;
      }

      const nextPendingTurnWord = getPendingTurnWord(result.state);

      setSelectedTileId(null);
      setSelectedPreparedSlotIndex(null);
      setIsKeyboardPreparationEntryActive(false);
      setIsPendingWordSelected(false);
      setSelectedBoardCell(getAppendCellForPendingWord(result.state, nextPendingTurnWord));
      onGameChange({
        ...result.state,
        message: {
          tone: "info",
          text: "La suite de lettres a été déplacée. Vous pouvez encore la modifier avant de valider."
        }
      });
      return;
    }

    if (!selectedTileId && !cellTile && preparedTileIds.length <= 1) {
      setSelectedBoardCell((currentCell) =>
        currentCell?.row === row && currentCell.col === col ? null : { row, col }
      );
      setSelectedPreparedSlotIndex(null);
      setIsKeyboardPreparationEntryActive(false);
      onGameChange({
        ...game,
        message: {
          tone: "info",
          text: "Case choisie. Touchez une lettre dans vos lettres ou sur le plateau pour la poser ici."
        }
      });
      return;
    }

    if (preparedTileIds.length > 0) {
      const placement = findPreparedPlacementAt(game, preparedTileIds, preparedWord, row, col);
      const result = placement
        ? placeWord(game, preparedTileIds, placement.row, placement.col, placement.direction)
        : { ok: false as const, reason: "Touchez une case compatible avec le chevalet préparé.", state: game };
      clearHint();
      if (!result.ok) {
        pushUndoPoint();
        const attemptedCells = buildAttemptPreviewCells(game, preparedWord, row, col, "row");
        setErrorPreviewCells(attemptedCells);
        setInvalidCellKeys(attemptedCells.map((cell) => `${cell.row}:${cell.col}`));
      }
      if (result.ok) {
        pushUndoPoint();
      }
      onGameChange(
        result.ok
          ? result.state
          : {
              ...result.state,
              message: {
                tone: "notice",
                text: `${result.reason} Touchez une autre case pour replacer le mot.`
              }
            }
      );
      if (result.ok) {
        setPreparedTileIds([]);
        setIsPendingWordSelected(false);
      }
      setSelectedTileId(null);
      return;
    }

    if (!selectedTileId) {
      onGameChange({
        ...game,
        message: {
          tone: "info",
          text: "Choisissez d'abord une lettre dans votre chevalet."
        }
      });
      return;
    }

    const result = placeTile(game, selectedTileId, row, col);
    clearHint();
    clearPreparedDestinationSelection();
    pushUndoPoint();
    onGameChange(
      result.ok
        ? result.state
        : {
            ...result.state,
            message: {
              tone: "notice",
              text: result.reason
            }
          }
    );
    if (result.ok) {
      removePreparedTileId(selectedTileId);
      setIsPendingWordSelected(false);
    }
    setSelectedTileId(null);
  }

  function removePreparedTileId(tileId: string) {
    setPreparedTileSlots((currentSlots) => removeTileIdFromPreparedSlots(currentSlots, tileId));
  }

  function handlePlaceTileOnBoard(tileId: string, row: number, col: number) {
    if (isFinished) {
      return;
    }

    clearErrorHighlights();
    clearHint();
    clearPreparedDestinationSelection();

    const result = placeTile(game, tileId, row, col);
    pushUndoPoint();
    onGameChange(
      result.ok
        ? result.state
        : {
            ...result.state,
            message: {
              tone: "notice",
              text: result.reason
            }
          }
    );
    if (result.ok) {
      setPreparedTileSlots((currentSlots) => removeTileIdFromPreparedSlots(currentSlots, tileId));
      setIsPendingWordSelected(false);
    }
    setSelectedTileId(null);
  }

  function handleCellDoubleClick(row: number, col: number) {
    if (isFinished) {
      return;
    }

    clearErrorHighlights();
    const tile = game.board[row]?.[col]?.tile;

    if (!tile || tile.committed || tile.owner !== "human") {
      return;
    }

    clearHint();
    const removedTile = removeHumanTurnTile(game, tile.id);

    if (removedTile.ok) {
      pushUndoPoint();
      setPreparedTileSlots((currentSlots) => removeTileIdFromPreparedSlots(currentSlots, tile.id));
      setIsPendingWordSelected(false);
      onGameChange(removedTile.state);
    }
    setSelectedTileId(null);
  }

  function handleValidate() {
    if (isFinished) {
      return;
    }

    const completeHint = isCompleteHintVisible ? hint : null;

    setSelectedTileId(null);
    clearPreparedDestinationSelection();
    clearHint();
    clearErrorHighlights();

    if (completeHint) {
      setPreparedTileIds([]);
      setIsPendingWordSelected(false);
      pushUndoPoint();
      onGameChange(validatePreparedHint(game, completeHint));
      return;
    }

    if (getPlacedTiles(game.board).length > 0) {
      const validation = validateTurn(game.board);
      if (!validation.ok) {
        pushUndoPoint();
        setInvalidCellKeys(getUncommittedCellKeys(game));
        onGameChange(validateHumanTurn(game));
        return;
      }

      setPreparedTileIds([]);
      setIsPendingWordSelected(false);
      pushUndoPoint();
      onGameChange(validateHumanTurn(game));
      return;
    }

    const validation = validateTurn(game.board);
    if (!validation.ok) {
      pushUndoPoint();
      setInvalidCellKeys(getUncommittedCellKeys(game));
      onGameChange(validateHumanTurn(game));
      return;
    }

    setPreparedTileIds([]);
    setIsPendingWordSelected(false);
    pushUndoPoint();
    onGameChange(validateHumanTurn(game));
  }

  function handlePass() {
    if (isFinished) {
      return;
    }

    cancelHintSearch();
    setSelectedTileId(null);
    setPreparedTileIds([]);
    clearPreparedDestinationSelection();
    setIsPendingWordSelected(false);
    clearHint();
    clearErrorHighlights();
    setIsExchangeMode(false);
    setSelectedExchangeTileIds([]);
    pushUndoPoint();
    onGameChange(passHumanTurn(game));
  }

  function handleToggleExchangeTile(tileId: string) {
    setSelectedExchangeTileIds((currentTileIds) =>
      currentTileIds.includes(tileId)
        ? currentTileIds.filter((currentTileId) => currentTileId !== tileId)
        : [...currentTileIds, tileId]
    );
  }

  function handleExchange() {
    if (!canUseExchangeMode && !isExchangeMode) {
      return;
    }

    cancelHintSearch();
    clearHint();
    clearErrorHighlights();
    setSelectedTileId(null);
    clearPreparedDestinationSelection();
    setIsPendingWordSelected(false);

    if (!isExchangeMode) {
      if (hasPreparedActivity) {
        pushUndoPoint();
        setPreparedTileIds([]);
        onGameChange({
          ...undoHumanTurn(game),
          message: {
            tone: "info",
            text: "Les lettres du plateau et du chevalet sont revenues dans Vos lettres. Choisissez celles à échanger."
          }
        });
      }

      setSelectedExchangeTileIds([]);
      setIsExchangeMode(true);
      return;
    }

    const result = exchangeHumanTiles(game, selectedExchangeTileIds);

    if (!result.ok) {
      onGameChange({
        ...result.state,
        message: {
          tone: "notice",
          text: result.reason
        }
      });
      return;
    }

    setIsExchangeMode(false);
    setSelectedExchangeTileIds([]);
    pushUndoPoint();
    onGameChange(result.state);
  }

  function handleCancelExchange() {
    setIsExchangeMode(false);
    setSelectedExchangeTileIds([]);
  }

  function handleUndoAction() {
    if (!canUndoAction) {
      return;
    }

    cancelHintSearch();
    const snapshot = undoHistory[undoHistory.length - 1];
    setUndoHistory((currentHistory) => currentHistory.slice(0, -1));
    setRedoHistory((currentHistory) => [...currentHistory.slice(-(UNDO_HISTORY_LIMIT - 1)), createUndoSnapshot()]);
    restoreUndoSnapshot(snapshot, "La dernière action a été défaite.");
  }

  function handleRedoAction() {
    if (!canRedoAction) {
      return;
    }

    cancelHintSearch();
    const snapshot = redoHistory[redoHistory.length - 1];
    setRedoHistory((currentHistory) => currentHistory.slice(0, -1));
    setUndoHistory((currentHistory) => [...currentHistory.slice(-(UNDO_HISTORY_LIMIT - 1)), createUndoSnapshot()]);
    restoreUndoSnapshot(snapshot, "La dernière action a été refaite.");
  }

  function clearHint() {
    setHint(null);
    setHintLevel(0);
  }

  function dismissHint() {
    pushUndoPoint();
    clearHint();
    setPreparedTileSlots(createEmptyPreparedSlots());
    clearPreparedDestinationSelection();
    setIsPendingWordSelected(false);
    clearErrorHighlights();
    onGameChange({
      ...game,
      message: {
        tone: "info",
        text: "L'indice a été retiré. À vous de jouer."
      }
    });
  }

  function revealHintLevel(nextHint: BestMoveHint, nextHintLevel: HintLevel, recordUndo = true, baseGame = game) {
    const directionLabel = nextHint.direction === "row" ? "horizontalement" : "verticalement";
    const levelMessage = getHintMessage(nextHint, nextHintLevel, directionLabel, usesProgressiveHints);

    if (recordUndo) {
      pushUndoPoint();
    }

    setHint(nextHint);
    setHintLevel(nextHintLevel);
    setIsPendingWordSelected(false);
    setSelectedTileId(null);
    clearPreparedDestinationSelection();
    clearErrorHighlights();

    if (nextHintLevel >= MAX_HINT_LEVEL) {
      setPreparedTileSlots(packPreparedTileSlots(nextHint.tileIds));
    } else {
      setPreparedTileSlots(getHintPreparedTileSlots(nextHint, nextHintLevel));
    }

    const nextGame = recordHumanHintUse(baseGame, nextHintLevel >= MAX_HINT_LEVEL ? "complete" : "partial");

    onGameChange({
      ...nextGame,
      message: {
        tone: "info",
        text: levelMessage,
        scoreDetails: nextHintLevel >= MAX_HINT_LEVEL ? nextHint.scoreDetails : undefined
      }
    });
  }

  function handleHint() {
    if (isFinished) {
      return;
    }

    if (hintMode === "none") {
      return;
    }

    if (isHintSearching) {
      return;
    }

    if (hint) {
      if (hintMode === "complete") {
        dismissHint();
        return;
      }

      if (hintLevel < MAX_HINT_LEVEL) {
        const nextHintLevel = (hintLevel + 1) as HintLevel;
        revealHintLevel(hint, nextHintLevel);
        return;
      }

      revealHintLevel(hint, 1);
      return;
    }

    cancelHintSearch();
    const searchGame = pendingTurnWord ? undoHumanTurn(game) : game;
    const hadPreparedActivity = hasPreparedActivity;

    pushUndoPoint();
    setIsHintSearching(true);
    setPreparedTileIds([]);
    setSelectedTileId(null);
    clearPreparedDestinationSelection();
    setIsPendingWordSelected(false);
    clearErrorHighlights();
    onGameChange({
      ...searchGame,
      message: {
        tone: "info",
        text: hadPreparedActivity
          ? "Les lettres en cours ont été reprises pour chercher un indice clair."
          : "Le robot cherche un indice possible."
      }
    });

    const requestId = hintSearchRequestIdRef.current + 1;
    hintSearchRequestIdRef.current = requestId;

    hintSearchTimeoutRef.current = window.setTimeout(() => {
      void findBestHumanMoveAsync(searchGame)
        .then((nextHint) => {
          if (hintSearchRequestIdRef.current !== requestId) {
            return;
          }

          hintSearchTimeoutRef.current = null;
          setIsHintSearching(false);
          const metrics = getLastSearchWorkerMetrics();
          if (metrics) {
            setSearchDiagnostic({
              label: "Indice",
              metrics
            });
          }

          if (!nextHint) {
            clearHint();
            clearErrorHighlights();
            onGameChange({
              ...searchGame,
              message: {
                tone: "notice",
                text: "Aucun mot possible n'a été trouvé avec le dictionnaire actuel."
              }
            });
            return;
          }

          revealHintLevel(nextHint, hintMode === "complete" ? MAX_HINT_LEVEL : 1, false, searchGame);
        })
        .catch(() => {
          if (hintSearchRequestIdRef.current !== requestId) {
            return;
          }

          hintSearchTimeoutRef.current = null;
          setIsHintSearching(false);
          onGameChange({
            ...searchGame,
            message: {
              tone: "notice",
              text: "La recherche d'indice n'a pas abouti. Vous pouvez réessayer."
            }
          });
        });
    }, HINT_SEARCH_DELAY_MS);
  }

  function handleAddPreparedTile(tileId: string) {
    if (isFinished) {
      return;
    }

    if (selectedBoardCell) {
      handleDirectTilePlacement(tileId, selectedBoardCell.row, selectedBoardCell.col);
      return;
    }

    const targetIndex = selectedPreparedSlotIndex ?? getAppendPreparedSlotIndex(preparedTileSlots);

    moveTileToPreparedSlot(tileId, targetIndex);
  }

  function handleKeyboardLetterEntry(letter: string): boolean {
    if (isFinished || isExchangeMode || game.turn.player !== "human") {
      return false;
    }

    const tile = game.racks.human.find((rackTile) => rackTile.letter === letter && !preparedTileIds.includes(rackTile.id));

    if (!tile) {
      onGameChange({
        ...game,
        message: {
          tone: "notice",
          text: `La lettre ${letter} n'est pas disponible dans vos lettres.`
        }
      });
      return true;
    }

    const targetCell = selectedBoardCell ?? getAppendCellForPendingWord(game, pendingTurnWord);

    if (targetCell) {
      handleDirectTilePlacement(tile.id, targetCell.row, targetCell.col);
      return true;
    }

    if (selectedPreparedSlotIndex !== null || isKeyboardPreparationEntryActive || isFocusInsidePreparationZone()) {
      handleAddPreparedTile(tile.id);
      setIsKeyboardPreparationEntryActive(true);
      return true;
    }

    return false;
  }

  function handleKeyboardDeleteEntry(): boolean {
    if (isFinished || isExchangeMode || game.turn.player !== "human") {
      return false;
    }

    const lastPreparedTileId = getLastPreparedTileId(preparedTileSlots);

    if (lastPreparedTileId) {
      handleRemovePreparedTile(lastPreparedTileId);
      setIsKeyboardPreparationEntryActive(true);
      return true;
    }

    const lastPendingBoardTile = getLastPendingBoardTile(game);

    if (lastPendingBoardTile) {
      const removedTile = removeHumanTurnTile(game, lastPendingBoardTile.id);

      if (removedTile.ok) {
        pushUndoPoint();
        clearHint();
        setIsPendingWordSelected(false);
        clearErrorHighlights();
        setSelectedTileId(null);
        setSelectedPreparedSlotIndex(null);
        setIsKeyboardPreparationEntryActive(false);
        setSelectedBoardCell({ row: lastPendingBoardTile.row, col: lastPendingBoardTile.col });
        onGameChange(removedTile.state);
        return true;
      }
    }

    return false;
  }

  function handleDirectTilePlacement(tileId: string, row: number, col: number) {
    clearErrorHighlights();
    clearHint();
    setSelectedPreparedSlotIndex(null);
    setIsKeyboardPreparationEntryActive(false);

    const result = placeTile(game, tileId, row, col);
    pushUndoPoint();
    onGameChange(
      result.ok
        ? result.state
        : {
            ...result.state,
            message: {
              tone: "notice",
              text: result.reason
            }
          }
    );

    if (result.ok) {
      const nextPendingTurnWord = getPendingTurnWord(result.state);

      removePreparedTileId(tileId);
      setIsPendingWordSelected(false);
      setSelectedBoardCell(getNextDirectPlacementCell(result.state, nextPendingTurnWord, row, col));
      setSelectedTileId(null);
      return;
    }

    setSelectedTileId(null);
  }

  function handleRotatePendingWord() {
    if (isFinished || game.turn.player !== "human" || (!pendingTurnWord && !hint)) {
      return;
    }

    if (!pendingTurnWord && hint) {
      handleRotateHint();
      return;
    }

    const nextDirection: PlacementDirection = pendingTurnWord?.direction === "row" ? "col" : "row";
    const rotatedPlacement = getRotatedPendingWordPlacement(game, nextDirection);

    if (!rotatedPlacement) {
      onGameChange({
        ...game,
        message: {
          tone: "notice",
          text: "Aucun mot posé ce tour-ci ne peut être tourné."
        }
      });
      return;
    }

    const result = movePendingHumanTiles(game, rotatedPlacement.row, rotatedPlacement.col, nextDirection);

    clearHint();
    clearErrorHighlights();
    pushUndoPoint();

    if (!result.ok) {
      onGameChange({
        ...result.state,
        message: {
          tone: "notice",
          text: `${result.reason} La direction du mot n'a pas été changée.`
        }
      });
      return;
    }

    const nextPendingTurnWord = getPendingTurnWord(result.state);

    setSelectedTileId(null);
    setSelectedPreparedSlotIndex(null);
    setIsKeyboardPreparationEntryActive(false);
    setIsPendingWordSelected(false);
    setSelectedBoardCell(getAppendCellForPendingWord(result.state, nextPendingTurnWord));
    onGameChange({
      ...result.state,
      message: {
        tone: "info",
        text: nextDirection === "row" ? "Le mot est maintenant horizontal." : "Le mot est maintenant vertical."
      }
    });
  }

  function handleRotateHint() {
    if (!hint) {
      return;
    }

    const nextDirection: PlacementDirection = hint.direction === "row" ? "col" : "row";
    const rotatedHint = getRotatedHint(game, hint, nextDirection);

    clearErrorHighlights();

    if (!rotatedHint) {
      onGameChange({
        ...game,
        message: {
          tone: "notice",
          text: "L'indice ne peut pas être tourné à cet endroit."
        }
      });
      return;
    }

    pushUndoPoint();
    setHint(rotatedHint);
    setPreparedTileSlots(hintLevel >= MAX_HINT_LEVEL ? packPreparedTileSlots(rotatedHint.tileIds) : getHintPreparedTileSlots(rotatedHint, hintLevel));
    onGameChange({
      ...game,
      message: {
        tone: "info",
        text: nextDirection === "row" ? "L'indice est maintenant horizontal." : "L'indice est maintenant vertical."
      }
    });
  }

  function handleInsertPreparedTile(tileId: string, targetIndex: number) {
    if (isFinished) {
      return;
    }

    moveTileToPreparedSlot(tileId, targetIndex);
  }

  function handleMovePreparedTileToEnd(tileId: string) {
    handleInsertPreparedTile(tileId, getAppendPreparedSlotIndex(preparedTileSlots));
  }

  function moveTileToPreparedSlot(tileId: string, targetIndex: number) {
    const pendingBoardTile = getPendingBoardTile(game, tileId);
    const removedFromBoard = pendingBoardTile ? removeHumanTurnTile(game, tileId) : null;
    const nextGame = removedFromBoard?.ok ? removedFromBoard.state : game;

    pushUndoPoint();
    setSelectedTileId(null);
    clearPreparedDestinationSelection();
    clearHint();
    setIsPendingWordSelected(false);
    clearErrorHighlights();
    setPreparedTileSlots((currentSlots) => placeTileIdInPreparedSlot(currentSlots, tileId, targetIndex, nextGame));

    if (removedFromBoard?.ok) {
      onGameChange(nextGame);
    }
  }

  function handleRecallPlacedTurnTiles() {
    if (isFinished) {
      return;
    }

    if (!pendingTurnWord) {
      return;
    }

    clearHint();
    setIsPendingWordSelected(false);
    clearPreparedDestinationSelection();
    clearErrorHighlights();
    pushUndoPoint();
    setPreparedTileSlots(removeBoardTileTokensFromPreparedSlots);
    onGameChange(undoHumanTurn(game));
  }

  function handleRemovePreparedTile(tileId: string) {
    if (isFinished) {
      return;
    }

    clearHint();
    setIsPendingWordSelected(false);
    clearErrorHighlights();
    const removedTile = removeHumanTurnTile(game, tileId);
    if (removedTile.ok) {
      pushUndoPoint();
      setPreparedTileSlots((currentSlots) => removeTileIdFromPreparedSlots(currentSlots, tileId));
      onGameChange(removedTile.state);
      return;
    }

    pushUndoPoint();
    setPreparedTileSlots((currentSlots) => removeTileIdFromPreparedSlots(currentSlots, tileId));
  }

  function handleClearPreparedWord() {
    if (isFinished) {
      return;
    }

    clearHint();
    setIsPendingWordSelected(false);
    clearErrorHighlights();
    if (pendingTurnWord) {
      pushUndoPoint();
      onGameChange(undoHumanTurn(game));
      setPreparedTileIds([]);
      return;
    }

    if (preparedTileIds.length > 0) {
      pushUndoPoint();
    }
    setPreparedTileIds([]);
  }

  function clearErrorHighlights() {
    setErrorPreviewCells([]);
    setInvalidCellKeys([]);
    setFloatingScorePreview(null);
  }

  function handleRecenterBoard() {
    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    setIsBoardRecenterVisible(false);
    boardSectionRef.current?.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "start",
      inline: "nearest"
    });
  }

  function cancelHintSearch() {
    hintSearchRequestIdRef.current += 1;

    if (hintSearchTimeoutRef.current !== null) {
      window.clearTimeout(hintSearchTimeoutRef.current);
      hintSearchTimeoutRef.current = null;
    }

    setIsHintSearching(false);
  }

  const getButtonHintProps = (description: string) => createButtonHintProps(description, hintsEnabled);
  const hintButtonContent = isHintSearching ? (
    <span className="button-searching">
      <span className="searching-dots" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <span>Cherche</span>
    </span>
  ) : hint ? (
    usesProgressiveHints ? <span className="button-compact-label">{`Indice ${hintLevel}/${MAX_HINT_LEVEL}`}</span> : "Indice"
  ) : hintMode === "none" ? (
    "Indice désactivé"
  ) : (
    "Indice"
  );

  return (
    <main className="game-layout">
      <header
        className={`game-topbar${isMobileTopbarCollapsed ? " game-topbar-collapsed" : ""}`}
        aria-label="Actions principales"
      >
        <button
          className="mobile-topbar-restore"
          type="button"
          onClick={() => setIsMobileTopbarCollapsed(false)}
          aria-expanded="false"
          aria-controls="game-topbar-content"
        >
          Menu
        </button>
        <div id="game-topbar-content" className="game-topbar-content">
          <button
            className="mobile-topbar-collapse"
            type="button"
            onClick={() => setIsMobileTopbarCollapsed(true)}
            aria-label="Masquer les actions principales"
            aria-expanded="true"
            aria-controls="game-topbar-content"
          >
            -
          </button>
          <nav className="topbar-links" aria-label="Navigation du jeu">
            <button
              type="button"
              onClick={onNewGameRequest}
              {...getButtonHintProps("Commence une nouvelle partie. Une confirmation est demandée si une partie est en cours.")}
            >
              Nouvelle partie
            </button>
            <button
              type="button"
              onClick={onRulesRequest}
              {...getButtonHintProps("Ouvre les règles, les bonus et la distribution des lettres.")}
            >
              Règles
            </button>
            <button
              type="button"
              onClick={onLexiconRequest}
              {...getButtonHintProps("Ouvre le lexique et les explications de mots disponibles.")}
            >
              Lexique
            </button>
            <button type="button" onClick={onOptionsRequest} {...getButtonHintProps("Ouvre les options de partie.")}>
              Options
            </button>
          </nav>
          <div className="topbar-scale-control" aria-label="Taille de l'interface">
            <span>Affichage</span>
            <button
              className="secondary-button"
              type="button"
              onClick={onDecreaseInterfaceScale}
              disabled={!canDecreaseInterfaceScale}
              aria-label="Réduire l'interface"
              {...getButtonHintProps("Réduit la taille générale de l'interface et du plateau.")}
            >
              -
            </button>
            <strong aria-live="polite">{interfaceScaleLabel}</strong>
            <button
              className="secondary-button"
              type="button"
              onClick={onIncreaseInterfaceScale}
              disabled={!canIncreaseInterfaceScale}
              aria-label="Agrandir l'interface"
              {...getButtonHintProps("Agrandit la taille générale de l'interface et du plateau.")}
            >
              +
            </button>
          </div>
        </div>
      </header>

      <section ref={boardSectionRef} className="game-main" aria-label="Partie en cours">
        <section className="game-status-panel" aria-label="Scores et informations de partie">
          <div
            className={!isFinished && game.turn.player === "human" ? "active-score active-score-human" : undefined}
            aria-current={!isFinished && game.turn.player === "human" ? "true" : undefined}
          >
            <span>Vous</span>
            <strong>{game.scores.human}</strong>
          </div>
          <div
            className={!isFinished && game.turn.player === "computer" ? "active-score active-score-computer" : undefined}
            aria-current={!isFinished && game.turn.player === "computer" ? "true" : undefined}
          >
            <span className="status-label-with-badge">
              Robot
              <em className={`opponent-level-badge level-${opponentLevel}`}>{OPPONENT_LEVEL_LABELS[opponentLevel]}</em>
            </span>
            <strong>{game.scores.computer}</strong>
          </div>
          <div>
            <span>Pioche</span>
            <strong>{game.bag.length}</strong>
          </div>
          <div>
            <span className="status-grid-label">Grille</span>
            <strong>{game.board.length}x{game.board.length}</strong>
          </div>
        </section>
        <BoardView
          board={game.board}
          selectedBoardCellKey={selectedBoardCell ? `${selectedBoardCell.row}:${selectedBoardCell.col}` : null}
          referenceBoardCellKey={pendingWordStartCellKey}
          hint={isCompleteHintVisible ? hint : null}
          hintAreaCellKeys={hintAreaCellKeys}
          hintAnchorCellKeys={hintAnchorCellKeys}
          hintPositionCellKeys={hintPositionCellKeys}
          hintPreviewCells={hintPreviewCells}
          preparedBoardTileKeys={preparedBoardTileKeys}
          preparedPreviewCells={preparedPreviewCells}
          errorPreviewCells={errorPreviewCells}
          invalidCellKeys={invalidCellKeys}
          newWordCellKeys={pendingNewWordCellKeys}
          lastMoveCellKeys={lastMoveCellKeys}
          animatedCellKeys={computerMoveCellKeys}
          bonusAnimationCells={bonusAnimationCells}
          boardScorePreview={boardScorePreview}
          isPendingWordSelected={isPendingWordSelected}
          floatingPreparedWord={floatingPreparedWord}
          floatingScorePreview={floatingScorePreview}
          onCellClick={handleCellClick}
          onCellDoubleClick={handleCellDoubleClick}
          onTileDrop={handlePlaceTileOnBoard}
        />
      </section>

      <aside className="game-side" aria-label="Informations de partie">
        <section className="panel word-builder preparation-zone" aria-labelledby="word-builder-title" aria-live="polite">
          <h2 id="word-builder-title" className="visually-hidden">
            Zone de préparation
          </h2>
          <div className="preparation-rack-area">
            <RackView
              rack={game.racks.human}
              preparedTileIds={preparedTileIds}
              exchangeTileIds={selectedExchangeTileIds}
              isExchangeMode={isExchangeMode}
              selectedBoardCell={selectedBoardCell}
              selectedPreparedSlotIndex={selectedPreparedSlotIndex}
              onAddTile={handleAddPreparedTile}
              onRotateBoardWord={handleRotatePendingWord}
              onToggleExchangeTile={handleToggleExchangeTile}
              canRotateBoardWord={!isFinished && game.turn.player === "human" && Boolean(pendingTurnWord || hint)}
              rotateBoardWordDirection={pendingTurnWord?.direction ?? hint?.direction ?? "row"}
            />
          </div>
          <div className="preparation-subsection">
            <div className="preparation-subheading">
              <h3>Chevalet</h3>
            </div>
            <PreparedWordTiles
              displayedWord={displayedPreparedWord}
              tileSlots={preparedTileSlotDetails}
              tileIdSlots={preparedTileSlots}
              selectedSlotIndex={selectedPreparedSlotIndex}
              boardTileKeys={preparedBoardTileKeys}
              onInsertTile={handleInsertPreparedTile}
              onMoveTileToEnd={handleMovePreparedTileToEnd}
              onRemoveTile={handleRemovePreparedTile}
              onSelectSlot={(slotIndex) => {
                const isSelectingNewSlot = selectedPreparedSlotIndex !== slotIndex;
                setSelectedBoardCell(null);
                setSelectedPreparedSlotIndex(isSelectingNewSlot ? slotIndex : null);
                setIsKeyboardPreparationEntryActive(isSelectingNewSlot);
              }}
            />
          </div>
          <div className="mobile-action-bar with-history" aria-label="Actions rapides">
            <button
              type="button"
              onClick={handleValidate}
              disabled={isFinished || game.turn.player !== "human" || !canValidate}
              {...getButtonHintProps("Valide le coup posé sur le plateau.")}
            >
              Valider
            </button>
            <button
              className={`secondary-button hint-action-button${hint ? " active-action" : ""}${isHintSearching ? " hint-searching-button" : ""}`}
              type="button"
              aria-pressed={Boolean(hint)}
              onClick={handleHint}
              disabled={isExchangeMode || isHintDisabled}
              {...getButtonHintProps(
                isExchangeMode
                  ? "Terminez ou annulez l'échange avant de demander un indice."
                  : getHintButtonDescription(hintMode, isHintSearching, hint, hintLevel)
              )}
            >
              {hintButtonContent}
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={handlePass}
              disabled={isExchangeMode || isFinished || game.turn.player !== "human"}
              {...getButtonHintProps(
                isExchangeMode
                  ? "Terminez ou annulez l'échange avant de passer votre tour."
                  : "Passe votre tour et laisse le robot jouer."
              )}
            >
              Passer
            </button>
            <button
              className="secondary-button icon-action-button"
              type="button"
              aria-label="Défaire"
              onClick={handleUndoAction}
              disabled={!canUndoAction || game.turn.player !== "human"}
              {...getButtonHintProps(getUndoButtonDescription(canUndoAction, usesFullUndoMode))}
            >
              <span aria-hidden="true">↶</span>
            </button>
            <button
              className={`secondary-button${isExchangeMode ? " active-action" : ""}`}
              type="button"
              onClick={handleExchange}
              disabled={!canUseExchangeMode || (isExchangeMode && selectedExchangeTileIds.length === 0)}
              aria-pressed={isExchangeMode}
              {...getButtonHintProps(exchangeButtonHint)}
            >
              {exchangeButtonLabel}
            </button>
            {isExchangeMode ? (
              <button
                className="secondary-button"
                type="button"
                onClick={handleCancelExchange}
                {...getButtonHintProps("Annule la sélection des lettres à échanger.")}
              >
                Annuler
              </button>
            ) : null}
            <button
              className="secondary-button compact-action-button"
              type="button"
              onClick={handleRecallPlacedTurnTiles}
              disabled={isFinished || !pendingTurnWord}
              {...getButtonHintProps("Reprend du plateau les lettres posées ce tour. Le chevalet reste en place ; les lettres déjà présentes sur le plateau en sont retirées.")}
            >
              Reprendre
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={handleClearPreparedWord}
              disabled={isFinished || (preparedTileIds.length === 0 && !pendingTurnWord)}
              {...getButtonHintProps("Vide le chevalet. Si des lettres sont posées ce tour, elles reviennent dans vos lettres.")}
            >
              Effacer
            </button>
            <button
              className="secondary-button icon-action-button"
              type="button"
              aria-label="Refaire"
              onClick={handleRedoAction}
              disabled={!canRedoAction || game.turn.player !== "human"}
              {...getButtonHintProps(getRedoButtonDescription(canRedoAction, usesFullUndoMode))}
            >
              <span aria-hidden="true">↷</span>
            </button>
          </div>
          <div className="builder-actions with-history">
            <button
              type="button"
              onClick={handleValidate}
              disabled={isFinished || game.turn.player !== "human" || !canValidate}
              {...getButtonHintProps("Valide le coup posé sur le plateau.")}
            >
              Valider
            </button>
            <button
              className={`secondary-button hint-action-button${hint ? " active-action" : ""}${isHintSearching ? " hint-searching-button" : ""}`}
              type="button"
              aria-pressed={Boolean(hint)}
              onClick={handleHint}
              disabled={isExchangeMode || isHintDisabled}
              {...getButtonHintProps(
                isExchangeMode
                  ? "Terminez ou annulez l'échange avant de demander un indice."
                  : getHintButtonDescription(hintMode, isHintSearching, hint, hintLevel)
              )}
            >
              {hintButtonContent}
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={handlePass}
              disabled={isExchangeMode || isFinished || game.turn.player !== "human"}
              {...getButtonHintProps(
                isExchangeMode
                  ? "Terminez ou annulez l'échange avant de passer votre tour."
                  : "Passe votre tour et laisse le robot jouer."
              )}
            >
              Passer
            </button>
            <button
              className="secondary-button icon-action-button"
              type="button"
              aria-label="Défaire"
              onClick={handleUndoAction}
              disabled={!canUndoAction || game.turn.player !== "human"}
              {...getButtonHintProps(getUndoButtonDescription(canUndoAction, usesFullUndoMode))}
            >
              <span aria-hidden="true">↶</span>
            </button>
            <button
              className={`secondary-button${isExchangeMode ? " active-action" : ""}`}
              type="button"
              onClick={handleExchange}
              disabled={!canUseExchangeMode || (isExchangeMode && selectedExchangeTileIds.length === 0)}
              aria-pressed={isExchangeMode}
              {...getButtonHintProps(exchangeButtonHint)}
            >
              {exchangeButtonLabel}
            </button>
            {isExchangeMode ? (
              <button
                className="secondary-button"
                type="button"
                onClick={handleCancelExchange}
                {...getButtonHintProps("Annule la sélection des lettres à échanger.")}
              >
                Annuler
              </button>
            ) : null}
            <button
              className="secondary-button compact-action-button"
              type="button"
              onClick={handleRecallPlacedTurnTiles}
              disabled={isFinished || !pendingTurnWord}
              {...getButtonHintProps("Reprend du plateau les lettres posées ce tour. Le chevalet reste en place ; les lettres déjà présentes sur le plateau en sont retirées.")}
            >
              Reprendre
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={handleClearPreparedWord}
              disabled={isFinished || (preparedTileIds.length === 0 && !pendingTurnWord)}
              {...getButtonHintProps("Vide le chevalet. Si des lettres sont posées ce tour, elles reviennent dans vos lettres.")}
            >
              Effacer
            </button>
            <button
              className="secondary-button icon-action-button"
              type="button"
              aria-label="Refaire"
              onClick={handleRedoAction}
              disabled={!canRedoAction || game.turn.player !== "human"}
              {...getButtonHintProps(getRedoButtonDescription(canRedoAction, usesFullUndoMode))}
            >
              <span aria-hidden="true">↷</span>
            </button>
          </div>
          {pendingScoreDetails ? (
            <div className="pending-score-preview" aria-live="polite">
              <div className="pending-created-words">
                <span>Mots créés</span>
                <ul>
                  {pendingScoreDetails.words.map((word) => (
                    <li key={`${word.word}-${word.subtotal}`}>{word.word}</li>
                  ))}
                </ul>
              </div>
              <strong>
                Score prévu : {pendingScoreDetails.total} point{pendingScoreDetails.total > 1 ? "s" : ""}
              </strong>
              <ScoreDetailsDisclosure details={pendingScoreDetails} />
              <ScoreWordExplanations details={pendingScoreDetails} />
            </div>
          ) : null}
          <p className="preparation-guidance">
            {isHintSearching
              ? "Recherche d'un indice possible..."
              : hint
              ? getHintInstruction(hintLevel, usesProgressiveHints)
              : pendingTurnWord
                ? "Validez le mot ou touchez une lettre posée pour la retirer."
              : displayedPreparedWord
                ? "Touchez une case du plateau pour poser le mot préparé."
              : selectedTile
                ? `Lettre choisie : ${selectedTile.letter}.`
                : "Composez votre mot avant de le poser."}
          </p>
        </section>

        <div className={`message game-message message-${game.message.tone}`}>
          <div className={game.turn.player === "computer" ? "computer-thinking" : undefined} role="status" aria-live="polite">
            {game.turn.player === "computer" ? (
              <>
                <span>Le robot réfléchit</span>
                <span className="searching-dots" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
              </>
            ) : (
              game.message.text
            )}
          </div>
          {game.message.scoreDetails ? (
            <ScoreDetailsDisclosure details={game.message.scoreDetails} />
          ) : null}
          {game.message.scoreDetails ? (
            <ScoreWordExplanations details={game.message.scoreDetails} />
          ) : null}
        </div>

        <details className="help-panel">
          <summary>Aide</summary>
          <h3>{contextualHelp.title}</h3>
          <ul>
            {contextualHelp.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          {contextualHelp.note ? <p>{contextualHelp.note}</p> : null}
        </details>
        {import.meta.env.DEV && developerMode && searchDiagnostic ? (
          <section className="developer-diagnostic" aria-label="Diagnostic de recherche">
            <h2>Diagnostic dev</h2>
            <dl>
              <div>
                <dt>Recherche</dt>
                <dd>{searchDiagnostic.label}</dd>
              </div>
              {searchDiagnostic.profile ? (
                <div>
                  <dt>Profil</dt>
                  <dd>{searchDiagnostic.profile}</dd>
                </div>
              ) : null}
              <div>
                <dt>Mode</dt>
                <dd>{searchDiagnostic.metrics.usedWorker ? "worker" : "fallback"}</dd>
              </div>
              <div>
                <dt>Total</dt>
                <dd>{formatDuration(searchDiagnostic.metrics.wallDurationMs)}</dd>
              </div>
              <div>
                <dt>Calcul</dt>
                <dd>{formatDuration(searchDiagnostic.metrics.durationMs)}</dd>
              </div>
              <div>
                <dt>Dictionnaire</dt>
                <dd>{formatDuration(searchDiagnostic.metrics.dictionaryLoadMs)}</dd>
              </div>
            </dl>
          </section>
        ) : null}
      </aside>
      <button
        className={`mobile-recenter-board secondary-button${isBoardRecenterVisible ? "" : " mobile-recenter-board-hidden"}`}
        type="button"
        aria-label="Recentrer le plateau"
        tabIndex={isBoardRecenterVisible ? 0 : -1}
        onClick={handleRecenterBoard}
        {...getButtonHintProps("Ramène rapidement l'affichage sur le plateau.")}
      >
        Plateau
      </button>
      {finalStatus && dismissedGameOverId !== game.gameId ? (
        <GameOverDialog
          status={finalStatus}
          onClose={() => setDismissedGameOverId(game.gameId)}
          onNewGameRequest={onNewGameRequest}
        />
      ) : null}
    </main>
  );
}

function GameOverDialog({
  status,
  onClose,
  onNewGameRequest
}: {
  status: NonNullable<GameState["status"]> & { state: "finished" };
  onClose: () => void;
  onNewGameRequest: () => void;
}) {
  const title =
    status.winner === "draw"
      ? "Partie terminée"
      : status.winner === "human"
        ? "Vous gagnez"
        : "Le robot gagne";
  const detail =
    status.reason === "rack-empty"
      ? "La pioche est vide et un joueur n'a plus de lettres."
      : status.reason === "no-moves"
      ? "Aucun nouveau mot ne peut être créé par les deux joueurs."
      : "Plus aucun joueur n'a posé de mot après plusieurs tours.";
  const loser =
    status.winner === "draw"
      ? "Égalité"
      : status.winner === "human"
        ? "Perdant : robot"
        : "Perdant : vous";
  const stats = getFinalGameStats(status);

  return (
    <div className="game-over-backdrop" role="presentation">
      <GameOverAnimation winner={status.winner} />
      <section className="game-over-dialog" role="dialog" aria-modal="true" aria-labelledby="game-over-title">
        <span className="game-over-kicker">Fin de partie</span>
        <h2 id="game-over-title">{title}</h2>
        <p>{detail}</p>
        <div className="game-over-scores">
          <div className={status.winner === "human" ? "game-over-winner" : undefined}>
            <span>Vous</span>
            <strong>{status.finalScores.human}</strong>
          </div>
          <div className={status.winner === "computer" ? "game-over-winner" : undefined}>
            <span>Robot</span>
            <strong>{status.finalScores.computer}</strong>
          </div>
        </div>
        <p className="game-over-loser">{loser}</p>
        <div className="game-over-stats" aria-label="Statistiques de la partie">
          <span>Vos coups : {stats.humanTurns}</span>
          <span>Robot : {stats.computerTurns}</span>
          <span>Passes : {stats.passes}</span>
          <span>Échanges : {stats.exchanges}</span>
          <span>Indices partiels : {stats.hints.partial}</span>
          <span>Indices complets : {stats.hints.complete}</span>
        </div>
        <div className="game-over-actions">
          <button type="button" onClick={onClose}>
            Voir la partie
          </button>
          <button className="secondary-button" type="button" onClick={onNewGameRequest}>
            Nouvelle partie
          </button>
        </div>
      </section>
    </div>
  );
}

function getFinalGameStats(status: NonNullable<GameState["status"]> & { state: "finished" }) {
  return (
    status.stats ?? {
      humanTurns: 0,
      computerTurns: 0,
      passes: 0,
      exchanges: 0,
      hints: {
        partial: 0,
        complete: 0
      }
    }
  );
}

function getContextualHelp({
  canValidate,
  dictionaryWordCount,
  displayedPreparedWord,
  game,
  hintLevel,
  isExchangeMode,
  isFinished,
  isHintSearching,
  pendingScoreDetails,
  pendingTurnWord,
  selectedBoardCell,
  selectedExchangeTileIds,
  selectedPreparedSlotIndex,
  selectedTile,
  usesProgressiveHints
}: ContextualHelpParams): ContextualHelp {
  if (isFinished) {
    return {
      title: "La partie est terminée",
      items: [
        "Vous pouvez regarder le plateau avec le bouton Voir la partie.",
        "Nouvelle partie relance une grille complète.",
        "Les scores et les statistiques sont résumés dans la fenêtre de fin."
      ]
    };
  }

  if (game.turn.player === "computer") {
    return {
      title: "Le robot joue",
      items: [
        "Attendez la fin de son tour.",
        "Les dernières lettres jouées seront mises en évidence sur le plateau.",
        "Vous pourrez reprendre la main dès que le message indique À vous de jouer."
      ]
    };
  }

  if (isExchangeMode) {
    return {
      title: "Échanger des lettres",
      items: [
        "Touchez les lettres à remplacer dans Vos lettres.",
        selectedExchangeTileIds.length > 0
          ? "Appuyez sur Échanger pour remplacer les lettres choisies et passer votre tour."
          : "Choisissez au moins une lettre pour activer l'échange.",
        "Annuler revient à la préparation normale sans passer le tour."
      ]
    };
  }

  if (isHintSearching) {
    return {
      title: "Recherche d'indice",
      items: [
        "L'application cherche un coup possible avec vos lettres.",
        "Vous pouvez attendre quelques instants.",
        "Le plateau et le chevalet seront mis à jour quand l'indice sera prêt."
      ]
    };
  }

  if (hintLevel > 0) {
    return {
      title: usesProgressiveHints ? `Indice ${hintLevel}/6` : "Indice complet",
      items:
        hintLevel >= MAX_HINT_LEVEL || !usesProgressiveHints
          ? [
              "Le mot trouvé est visible dans le chevalet et sur le plateau.",
              "Appuyez sur Valider pour jouer ce mot.",
              "Appuyez à nouveau sur Indice pour retirer la proposition."
            ]
          : [
              "L'indice révèle progressivement des informations sur un mot possible.",
              "Appuyez encore sur Indice pour obtenir l'étape suivante.",
              "Vous pouvez aussi continuer à chercher par vous-même."
            ]
    };
  }

  if (pendingScoreDetails && canValidate) {
    return {
      title: "Mot prêt à valider",
      items: [
        "Le coup posé forme un mot reconnu.",
        "Appuyez sur Valider pour le jouer.",
        "Reprendre retire les lettres posées ce tour si vous voulez corriger."
      ]
    };
  }

  if (pendingTurnWord) {
    return {
      title: "Mot posé sur le plateau",
      items: [
        "Vous pouvez le valider si le coup est correct.",
        "Touchez une lettre posée ce tour pour la retirer.",
        "Reprendre remet les lettres du tour dans Vos lettres."
      ]
    };
  }

  if (displayedPreparedWord) {
    return {
      title: "Mot dans le chevalet",
      items: [
        "Touchez une case compatible du plateau pour poser le mot.",
        "Vous pouvez choisir une case du chevalet puis toucher une lettre pour l'y placer.",
        "Effacer vide le chevalet et remet les lettres dans Vos lettres."
      ],
      note: `Dictionnaire actuel : ${DICTIONARY_LABEL}, ${dictionaryWordCount} mots.`
    };
  }

  if (selectedTile && selectedBoardCell) {
    return {
      title: "Lettre et case choisies",
      items: [
        `Touchez une lettre de Vos lettres pour la poser sur la case sélectionnée.`,
        `La lettre ${selectedTile.letter} peut aussi être placée dans le chevalet.`,
        "Touchez une autre case vide pour changer la destination."
      ]
    };
  }

  if (selectedTile) {
    return {
      title: `Lettre ${selectedTile.letter} choisie`,
      items: [
        "Touchez une case vide du plateau pour poser cette lettre.",
        "Touchez une case du chevalet pour préparer un mot."
      ]
    };
  }

  if (selectedBoardCell) {
    return {
      title: "Case du plateau choisie",
      items: [
        "Touchez une lettre de Vos lettres pour la poser sur cette case.",
        "Touchez une autre case vide pour changer la sélection."
      ]
    };
  }

  if (selectedPreparedSlotIndex !== null) {
    return {
      title: "Case du chevalet choisie",
      items: [
        "Touchez une lettre de Vos lettres pour la placer dans cette case.",
        "Touchez une lettre déjà dans le chevalet pour la placer ici.",
        "Touchez la même case pour annuler la sélection."
      ]
    };
  }

  if (game.message.tone === "notice") {
    return {
      title: "Corriger le coup",
      items: [
        "Le dernier coup demande une correction.",
        "Modifiez les lettres sur le plateau ou reprenez votre coup.",
        "Vous pouvez demander un indice si vous êtes bloqué."
      ]
    };
  }

  return {
    title: "Commencer votre tour",
    items: [
      "Touchez une lettre, puis une case vide du plateau pour la poser.",
      "Ou préparez un mot dans le chevalet avant de le poser.",
      "Le premier mot doit passer par la case centrale."
    ],
    note: `Dictionnaire actuel : ${DICTIONARY_LABEL}, ${dictionaryWordCount} mots.`
  };
}

function GameOverAnimation({ winner }: { winner: PlayerId | "draw" }) {
  if (winner === "human") {
    return <WinButterfliesAnimation />;
  }

  if (winner === "computer") {
    return <LoseLeavesAnimation />;
  }

  return null;
}

function WinButterfliesAnimation() {
  return (
    <svg className="game-over-animation game-over-butterflies" viewBox="0 0 1080 640" aria-hidden="true">
      {["b1", "b2", "b3", "b4", "b5", "b6", "b7", "b8"].map((className) => (
        <g className={`game-over-butterfly ${className}`} key={className}>
          <ButterflyShape />
        </g>
      ))}
    </svg>
  );
}

function ButterflyShape() {
  return (
    <g className="game-over-butterfly-inner">
      <path className="wing wing-left-upper" d="M0 0 C-34 -42 -88 -36 -75 12 C-62 60 -20 38 0 8Z" />
      <path className="wing wing-left-lower" d="M0 7 C-34 15 -56 52 -28 70 C-3 84 7 34 4 12Z" />
      <path className="wing wing-right-upper" d="M0 0 C34 -42 88 -36 75 12 C62 60 20 38 0 8Z" />
      <path className="wing wing-right-lower" d="M0 7 C34 15 56 52 28 70 C3 84 -7 34 -4 12Z" />
      <path d="M-4 -18 C0 -6 0 20 4 42" className="butterfly-body" />
      <path d="M-2 -17 C-14 -30 -23 -35 -31 -39" className="butterfly-antenna" />
      <path d="M2 -17 C14 -30 23 -35 31 -39" className="butterfly-antenna" />
    </g>
  );
}

function LoseLeavesAnimation() {
  return (
    <svg className="game-over-animation game-over-leaves" viewBox="0 0 1080 640" aria-hidden="true">
      <defs>
        <g id="game-over-leaf">
          <g className="game-over-leaf-inner">
            <path className="leaf-shape" d="M0 -42 C34 -30 50 6 26 38 C11 58 -11 58 -27 39 C-54 7 -34 -30 0 -42Z" />
            <path className="leaf-vein-main" d="M0 -34 C1 -12 -2 11 -16 35" />
            <path className="leaf-vein-side" d="M-1 -10 C-14 -13 -24 -19 -32 -27" />
            <path className="leaf-vein-side" d="M-3 10 C9 4 20 -4 30 -15" />
          </g>
        </g>
      </defs>
      <use className="game-over-leaf l1" href="#game-over-leaf" />
      <use className="game-over-leaf l2" href="#game-over-leaf" />
      <use className="game-over-leaf l3" href="#game-over-leaf" />
      <use className="game-over-leaf l4" href="#game-over-leaf" />
      <use className="game-over-leaf l5" href="#game-over-leaf" />
      <use className="game-over-leaf l6" href="#game-over-leaf" />
      <use className="game-over-leaf l7" href="#game-over-leaf" />
      <use className="game-over-leaf l8" href="#game-over-leaf" />
      <use className="game-over-leaf l9" href="#game-over-leaf" />
      <use className="game-over-leaf l10" href="#game-over-leaf" />
    </svg>
  );
}

function PreparedWordTiles({
  displayedWord,
  tileSlots,
  tileIdSlots,
  selectedSlotIndex,
  boardTileKeys,
  onInsertTile,
  onMoveTileToEnd,
  onRemoveTile,
  onSelectSlot
}: {
  displayedWord: string;
  tileSlots: (Tile | null)[];
  tileIdSlots: (string | null)[];
  selectedSlotIndex: number | null;
  boardTileKeys: string[];
  onInsertTile: (tileId: string, targetIndex: number) => void;
  onMoveTileToEnd: (tileId: string) => void;
  onRemoveTile: (tileId: string) => void;
  onSelectSlot: (slotIndex: number) => void;
}) {
  const hasPreparedTiles = tileSlots.some(Boolean);
  const [insertionTargetIndex, setInsertionTargetIndex] = useState<number | null>(null);

  function clearInsertionTarget() {
    setInsertionTargetIndex(null);
  }

  return (
    <div
      className={`prepared-word prepared-word-tiles prepared-word-slots${hasPreparedTiles ? "" : " prepared-word-empty"}`}
      aria-label={displayedWord ? `Chevalet ${displayedWord}` : "Chevalet vide"}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        const nextTarget = event.relatedTarget;

        if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
          clearInsertionTarget();
        }
      }}
      onDrop={(event) => {
        event.preventDefault();
        clearInsertionTarget();
        const draggedTileId = getDraggedTileId(event);

        if (draggedTileId) {
          onMoveTileToEnd(draggedTileId);
        }
      }}
    >
      {tileSlots.map((tile, index) => {
        const tileId = tileIdSlots[index];
        const isBoardTile = tileId ? boardTileKeys.includes(parseBoardTileKey(tileId) ?? "") : false;

        if (!tile || !tileId) {
          const isSelectedSlot = selectedSlotIndex === index;

          return (
            <button
              className={`prepared-word-slot${isSelectedSlot ? " prepared-word-slot-selected" : ""}${insertionTargetIndex === index ? " prepared-word-insert-target" : ""}`}
              key={`slot-${index}`}
              type="button"
              data-slot-index={index}
              aria-label={
                isSelectedSlot
                  ? `Insérer à la position ${index + 1}, sélectionné`
                  : `Insérer à la position ${index + 1}`
              }
              aria-pressed={isSelectedSlot}
              onClick={() => onSelectSlot(index)}
              onDragOver={(event) => {
                event.preventDefault();
                setInsertionTargetIndex(index);
              }}
              onDrop={(event) => {
                event.preventDefault();
                event.stopPropagation();
                clearInsertionTarget();
                const draggedTileId = getDraggedTileId(event);

                if (draggedTileId) {
                  onInsertTile(draggedTileId, index);
                }
              }}
            />
          );
        }

        return (
          <button
            className={`prepared-word-tile${isBoardTile ? " prepared-word-tile-board" : ""}${insertionTargetIndex === index ? " prepared-word-insert-target" : ""}`}
            key={tileId}
            type="button"
            data-slot-index={index}
            aria-label={`${isBoardTile ? "Retirer la lettre du plateau" : "Retirer la lettre"} ${tile.letter} du chevalet`}
            title={isBoardTile ? "Lettre déjà sur le plateau" : "Remettre dans vos lettres"}
            onClick={() => {
              if (selectedSlotIndex !== null) {
                onInsertTile(tileId, selectedSlotIndex);
                return;
              }

              onRemoveTile(tileId);
            }}
            onDoubleClick={() => onMoveTileToEnd(tileId)}
            draggable={!isBoardTile}
            onDragStart={(event) => {
              if (isBoardTile) {
                event.preventDefault();
                return;
              }

              setDraggedTileId(event, tileId);
            }}
            onDragEnd={clearInsertionTarget}
            onDragOver={(event) => {
              event.preventDefault();
              setInsertionTargetIndex(index);
            }}
            onDrop={(event) => {
              event.preventDefault();
              event.stopPropagation();
              clearInsertionTarget();
              const draggedTileId = getDraggedTileId(event);

              if (draggedTileId) {
                onInsertTile(draggedTileId, index);
              }
            }}
          >
            <span>{tile.letter}</span>
            <small>{tile.value}</small>
          </button>
        );
      })}
    </div>
  );
}

function setDraggedTileId(event: DragEvent<HTMLElement>, tileId: string) {
  event.dataTransfer.setData(TILE_DRAG_MIME, tileId);
  event.dataTransfer.setData("text/plain", tileId);
  event.dataTransfer.effectAllowed = "move";
}

function getDraggedTileId(event: DragEvent<HTMLElement>): string {
  return event.dataTransfer.getData(TILE_DRAG_MIME) || event.dataTransfer.getData("text/plain");
}

function getKeyboardLetter(event: KeyboardEvent): string | null {
  if (event.key.length !== 1) {
    return null;
  }

  const letter = event.key
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleUpperCase("fr-CH");

  return /^[A-Z]$/u.test(letter) ? letter : null;
}

function isTextEntryTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

function isFocusInsidePreparationZone(): boolean {
  return Boolean(document.activeElement?.closest(".preparation-zone, .rack, .prepared-word"));
}

function getWordInitial(word: string): string | null {
  const initial = word
    .trim()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("fr-CH")
    .match(/[a-z]/)?.[0];

  return initial ?? null;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function ScoreWordExplanations({ details }: { details: ScoreDetails }) {
  const explanations = getUniqueScoreWordExplanations(details);

  if (explanations.length === 0) {
    return null;
  }

  return (
    <section className="score-word-explanations" aria-label="Explication du mot accepté">
      {explanations.map(({ word, explanation }) => (
        <WordExplanationCallout explanation={explanation} key={word} word={word} />
      ))}
    </section>
  );
}

function WordExplanationCallout({ word, explanation }: { word: string; explanation: WordExplanation | null }) {
  if (!explanation) {
    return (
      <article className="score-word-explanation-card">
        <strong>{word}</strong>
        <p>Mot reconnu dans {DICTIONARY_LABEL}. Sa fiche explicative n'est pas encore disponible.</p>
      </article>
    );
  }

  return (
    <article className="score-word-explanation-card">
      <p>
        {explanation.partOfSpeech} : {formatWordExplanationDefinition(explanation)}
      </p>
      {explanation.usage ? <p>{explanation.usage}</p> : null}
    </article>
  );
}

function buildAttemptPreviewCells(
  game: GameState,
  word: string,
  startRow: number,
  startCol: number,
  direction: PlacementDirection
): BoardPreviewCell[] {
  return [...word].flatMap((letter, index) => {
    const row = direction === "col" ? startRow + index : startRow;
    const col = direction === "row" ? startCol + index : startCol;

    if (!game.board[row]?.[col]) {
      return [];
    }

    return [{ row, col, letter }];
  });
}

function getPendingTurnWord(game: GameState): BoardFloatingWord | null {
  const geometry = getPendingTurnGeometry(game);

  if (!geometry) {
    return null;
  }

  return {
    word: geometry.word,
    direction: geometry.direction,
    row: geometry.row,
    col: geometry.col
  };
}

function getRotatedPendingWordPlacement(
  game: GameState,
  nextDirection: PlacementDirection
): SelectedBoardCell | null {
  const placedTiles = getOrderedPendingHumanTiles(game);

  if (placedTiles.length === 0) {
    return null;
  }

  const center = getBoardCenter(game.board);
  const hasCommittedTiles = game.board.flat().some((cell) => cell.tile?.committed);
  const centerTileIndex = placedTiles.findIndex((tile) => tile.row === center && tile.col === center);
  const anchorIndex = !hasCommittedTiles
    ? centerTileIndex >= 0
      ? centerTileIndex
      : Math.floor(placedTiles.length / 2)
    : 0;
  const anchorRow = !hasCommittedTiles ? center : placedTiles[anchorIndex].row;
  const anchorCol = !hasCommittedTiles ? center : placedTiles[anchorIndex].col;

  return {
    row: nextDirection === "col" ? anchorRow - anchorIndex : anchorRow,
    col: nextDirection === "row" ? anchorCol - anchorIndex : anchorCol
  };
}

function getRotatedHint(game: GameState, hint: BestMoveHint, nextDirection: PlacementDirection): BestMoveHint | null {
  const placement = getRotatedHintPlacement(game, hint, nextDirection);

  if (!placement) {
    return null;
  }

  const placedWord = placeWord(game, hint.tileIds, placement.row, placement.col, nextDirection);

  if (!placedWord.ok) {
    return null;
  }

  const validation = validateTurn(placedWord.state.board);

  if (!validation.ok) {
    return null;
  }

  const placedTiles = getPlacedTiles(placedWord.state.board);
  const scoreDetails = explainTurnScore(placedWord.state.board, validation.words, placedTiles);

  return {
    ...hint,
    row: placement.row,
    col: placement.col,
    direction: nextDirection,
    score: scoreDetails.total,
    scoreDetails,
    words: validation.words,
    board: placedWord.state.board,
    placedTiles,
    rackAfterMove: placedWord.state.racks.human
  };
}

function getRotatedHintPlacement(
  game: GameState,
  hint: BestMoveHint,
  nextDirection: PlacementDirection
): SelectedBoardCell | null {
  const center = getBoardCenter(game.board);
  const hasCommittedTiles = game.board.flat().some((cell) => cell.tile?.committed);
  const centerIndex = getHintCellIndexAt(hint, center, center);
  const anchorIndex = !hasCommittedTiles
    ? centerIndex >= 0
      ? centerIndex
      : Math.floor(hint.word.length / 2)
    : getFirstBoardTokenIndex(hint);
  const anchorRow = !hasCommittedTiles ? center : getHintCellRow(hint, anchorIndex);
  const anchorCol = !hasCommittedTiles ? center : getHintCellCol(hint, anchorIndex);

  return {
    row: nextDirection === "col" ? anchorRow - anchorIndex : anchorRow,
    col: nextDirection === "row" ? anchorCol - anchorIndex : anchorCol
  };
}

function getHintCellIndexAt(hint: BestMoveHint, row: number, col: number): number {
  return hint.word.split("").findIndex((_, index) => getHintCellRow(hint, index) === row && getHintCellCol(hint, index) === col);
}

function getFirstBoardTokenIndex(hint: BestMoveHint): number {
  const boardTokenIndex = hint.tileIds.findIndex((tileId) => Boolean(parseBoardTileKey(tileId)));

  return boardTokenIndex >= 0 ? boardTokenIndex : 0;
}

function getHintCellRow(hint: BestMoveHint, index: number): number {
  return hint.direction === "col" ? hint.row + index : hint.row;
}

function getHintCellCol(hint: BestMoveHint, index: number): number {
  return hint.direction === "row" ? hint.col + index : hint.col;
}

function movePendingHumanTiles(
  game: GameState,
  row: number,
  col: number,
  direction: PlacementDirection
): { ok: true; state: GameState } | { ok: false; reason: string; state: GameState } {
  const geometry = getPendingTurnGeometry(game);

  if (!geometry) {
    return { ok: false, reason: "Aucune suite de lettres posée n'est à déplacer.", state: game };
  }

  const movedTileIds = new Set(geometry.pendingTiles.map(({ tile }) => tile.id));
  const board = game.board.map((boardRow) =>
    boardRow.map((cell) => ({
      ...cell,
      tile: cell.tile && !movedTileIds.has(cell.tile.id) ? { ...cell.tile } : null
    }))
  );

  for (const { offset, tile } of geometry.pendingTiles) {
    const targetRow = direction === "col" ? row + offset : row;
    const targetCol = direction === "row" ? col + offset : col;

    if (!board[targetRow]?.[targetCol]) {
      return { ok: false, reason: "La suite de lettres dépasserait du plateau.", state: game };
    }

    const destinationTile = board[targetRow][targetCol].tile;

    if (destinationTile && (!destinationTile.committed || destinationTile.letter !== tile.letter)) {
      return { ok: false, reason: "Une case de destination contient déjà une lettre incompatible.", state: game };
    }

    if (destinationTile?.committed) {
      continue;
    }

    board[targetRow][targetCol].tile = {
      ...tile,
      row: targetRow,
      col: targetCol
    };
  }

  return {
    ok: true,
    state: {
      ...game,
      board,
      message: {
        tone: "info",
        text: "La suite de lettres a changé de direction. Vous pouvez encore la modifier avant de valider."
      }
    }
  };
}

type PendingTurnGeometry = {
  word: string;
  direction: PlacementDirection;
  row: number;
  col: number;
  pendingTiles: Array<{ tile: PlacedTile; offset: number }>;
};

function getPendingTurnGeometry(game: GameState): PendingTurnGeometry | null {
  const placedTiles = getOrderedPendingHumanTiles(game);

  if (placedTiles.length === 0) {
    return null;
  }

  const direction = getPendingTileDirection(placedTiles);
  const pendingTileIds = new Set(placedTiles.map((tile) => tile.id));
  let row = placedTiles[0].row;
  let col = placedTiles[0].col;

  while (direction === "row" ? game.board[row]?.[col - 1]?.tile : game.board[row - 1]?.[col]?.tile) {
    if (direction === "row") {
      col -= 1;
    } else {
      row -= 1;
    }
  }

  const startRow = row;
  const startCol = col;
  let word = "";
  const pendingTiles: Array<{ tile: PlacedTile; offset: number }> = [];
  let offset = 0;

  while (game.board[row]?.[col]?.tile) {
    const tile = game.board[row][col].tile;

    if (!tile) {
      break;
    }

    word += tile.letter;
    if (pendingTileIds.has(tile.id)) {
      pendingTiles.push({ tile, offset });
    }

    if (direction === "row") {
      col += 1;
    } else {
      row += 1;
    }
    offset += 1;
  }

  return {
    word,
    direction,
    row: startRow,
    col: startCol,
    pendingTiles
  };
}

function getLastPendingBoardTile(game: GameState): PlacedTile | null {
  const placedTiles = getOrderedPendingHumanTiles(game);

  return placedTiles.at(-1) ?? null;
}

function getOrderedPendingHumanTiles(game: GameState): PlacedTile[] {
  const placedTiles = game.board
    .flatMap((row) => row)
    .map((cell) => cell.tile)
    .filter((tile): tile is PlacedTile => Boolean(tile && !tile.committed && tile.owner === "human"));

  if (placedTiles.length === 0) {
    return [];
  }

  const direction = getPendingTileDirection(placedTiles);

  return [...placedTiles].sort((first, second) =>
    direction === "row" ? first.col - second.col : first.row - second.row
  );
}

function getPendingTileDirection(placedTiles: PlacedTile[]): PlacementDirection {
  const sameRow = placedTiles.every((tile) => tile.row === placedTiles[0].row);

  return sameRow ? "row" : "col";
}

function getAppendCellForPendingWord(game: GameState, pendingTurnWord: BoardFloatingWord | null): SelectedBoardCell | null {
  if (!pendingTurnWord || pendingTurnWord.row === undefined || pendingTurnWord.col === undefined) {
    return null;
  }

  return getNextEmptyBoardCell(game, pendingTurnWord.row, pendingTurnWord.col, pendingTurnWord.direction);
}

function getNextDirectPlacementCell(
  game: GameState,
  pendingTurnWord: BoardFloatingWord | null,
  fallbackRow: number,
  fallbackCol: number
): SelectedBoardCell | null {
  return getAppendCellForPendingWord(game, pendingTurnWord) ?? getNextEmptyBoardCell(game, fallbackRow, fallbackCol + 1, "row");
}

function getEmptyBoardCell(game: GameState, row: number, col: number): SelectedBoardCell | null {
  if (!game.board[row]?.[col] || game.board[row][col].tile) {
    return null;
  }

  return { row, col };
}

function getNextEmptyBoardCell(
  game: GameState,
  startRow: number,
  startCol: number,
  direction: PlacementDirection
): SelectedBoardCell | null {
  let row = startRow;
  let col = startCol;

  while (game.board[row]?.[col]) {
    if (!game.board[row][col].tile) {
      return { row, col };
    }

    if (direction === "row") {
      col += 1;
    } else {
      row += 1;
    }
  }

  return null;
}

function getPendingScoreDetails(game: GameState): ScoreDetails | null {
  const placedTiles = getPlacedTiles(game.board);

  if (placedTiles.length === 0) {
    return null;
  }

  const validation = validateTurn(game.board);

  if (!validation.ok) {
    return null;
  }

  return explainTurnScore(game.board, validation.words, placedTiles);
}

function getScoreWordCellKeys(details: ScoreDetails | null): string[] {
  if (!details) {
    return [];
  }

  return uniqueStrings(
    details.words.flatMap((word) => word.letters.map((letter) => `${letter.row}:${letter.col}`))
  );
}

function getHintCellKeys(hint: BestMoveHint): string[] {
  return [...hint.word].map((_, index) => {
    const row = hint.direction === "col" ? hint.row + index : hint.row;
    const col = hint.direction === "row" ? hint.col + index : hint.col;

    return `${row}:${col}`;
  });
}

function getHintMessage(
  hint: BestMoveHint,
  level: HintLevel,
  directionLabel: string,
  usesProgressiveHints: boolean
): string {
  const scoreLabel = `${hint.score} point${hint.score > 1 ? "s" : ""}`;
  const firstLetter = hint.word[0];
  const lastLetter = hint.word.at(-1);
  const secondLetter = hint.word[1] ?? "";

  if (!usesProgressiveHints) {
    return `Valider pour jouer le mot trouvé : ${hint.word}.`;
  }

  if (level === 1) {
    return `Indice 1/${MAX_HINT_LEVEL} : le mot commence par ${firstLetter}.`;
  }

  if (level === 2) {
    return `Indice 2/${MAX_HINT_LEVEL} : le mot finit par ${lastLetter} et contient ${hint.word.length} lettres.`;
  }

  if (level === 3) {
    return secondLetter
      ? `Indice 3/${MAX_HINT_LEVEL} : la deuxième lettre est ${secondLetter}.`
      : `Indice 3/${MAX_HINT_LEVEL} : le mot n'a que ${hint.word.length} lettre.`;
  }

  if (level === 4) {
    return `Indice 4/${MAX_HINT_LEVEL} : les lettres révélées sont placées sur le plateau. Le mot se pose ${directionLabel}, pour ${scoreLabel}.`;
  }

  if (level === 5) {
    return `Indice 5/${MAX_HINT_LEVEL} : ${getHintExplanationText(hint.word)}`;
  }

  return `Indice 6/${MAX_HINT_LEVEL} : valider pour jouer le mot trouvé : ${hint.word}.`;
}

function getHintInstruction(level: HintLevel, usesProgressiveHints: boolean): string {
  if (!usesProgressiveHints) {
    return "Appuyez sur Valider pour jouer ce mot.";
  }

  if (level === 1) {
    return "Indice 1/6 : la première lettre est donnée.";
  }

  if (level === 2) {
    return "Indice 2/6 : la dernière lettre et la taille du mot sont données.";
  }

  if (level === 3) {
    return "Indice 3/6 : la deuxième lettre est donnée.";
  }

  if (level === 4) {
    return "Indice 4/6 : les lettres révélées sont positionnées.";
  }

  if (level === 5) {
    return "Indice 5/6 : une explication est donnée sans révéler le mot.";
  }

  if (level === 6) {
    return "Indice 6/6 : appuyez sur Valider pour jouer ce mot.";
  }

  return "Demandez un indice pour être guidé progressivement.";
}

function getHintExplanationText(word: string): string {
  const explanation = getWordExplanation(word);

  if (!explanation) {
    return "aucune explication n'est encore disponible pour ce mot.";
  }

  const definition = maskHintExplanationWords(getHintDefinitionOnly(explanation), explanation);
  const usage = explanation.usage ? ` ${maskHintExplanationWords(explanation.usage, explanation)}` : "";

  return `${definition}${usage}`;
}

function getHintDefinitionOnly(explanation: WordExplanation): string {
  const labeledDefinition = explanation.shortDefinition.match(
    /(?:^|[.!?]\s+)[A-ZÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŸÆŒ-]{2,}\s*:\s*(.+)$/u
  );

  if (labeledDefinition?.[1]) {
    return labeledDefinition[1];
  }

  return explanation.shortDefinition;
}

function maskHintExplanationWords(text: string, explanation: WordExplanation): string {
  const hiddenWords = getHintExplanationHiddenWords(explanation);
  const maskedText = hiddenWords.reduce((nextText, hiddenWord) => {
    const escapedWord = escapeRegExp(hiddenWord);
    const wordPattern = new RegExp(`(?<![\\p{L}\\p{N}])${escapedWord}(?![\\p{L}\\p{N}])`, "giu");

    return nextText.replace(wordPattern, "un mot masqué");
  }, text);

  return maskedText
    .replace(/\b[Dd]e un mot masqué\b/gu, (match) => (match.startsWith("D") ? "D'un mot masqué" : "d'un mot masqué"))
    .replace(/\b[Dd]u un mot masqué\b/gu, (match) => (match.startsWith("D") ? "D'un mot masqué" : "d'un mot masqué"));
}

function getHintExplanationHiddenWords(explanation: WordExplanation): string[] {
  const candidates = [explanation.word, explanation.baseWord, explanation.lemma].filter(
    (candidate): candidate is string => Boolean(candidate)
  );
  const variants = candidates.flatMap((candidate) => [
    candidate,
    candidate.toLocaleUpperCase("fr-CH"),
    candidate.toLocaleLowerCase("fr-CH"),
    stripAccents(candidate).toLocaleUpperCase("fr-CH"),
    stripAccents(candidate).toLocaleLowerCase("fr-CH")
  ]);

  return Array.from(new Set(variants.filter(Boolean))).sort((first, second) => second.length - first.length);
}

function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getHintPreviewCells(game: GameState, hint: BestMoveHint, level: HintLevel): BoardPreviewCell[] {
  if (level >= 4 && level < MAX_HINT_LEVEL) {
    return getHintLetterPreviewCells(game, hint, getHintRevealedLetterIndexes(hint));
  }

  return [];
}

function getHintLetterPreviewCells(game: GameState, hint: BestMoveHint, indexes: number[]): BoardPreviewCell[] {
  const uniqueIndexes = uniqueNumbers(indexes);

  return uniqueIndexes.flatMap((index) => {
    const row = hint.direction === "col" ? hint.row + index : hint.row;
    const col = hint.direction === "row" ? hint.col + index : hint.col;

    if (game.board[row]?.[col]?.tile) {
      return [];
    }

    return [{ row, col, letter: hint.word[index] }];
  });
}

function getHintPositionedClueCellKeys(hint: BestMoveHint): string[] {
  return getHintRevealedLetterIndexes(hint).map((index) => {
    const row = hint.direction === "col" ? hint.row + index : hint.row;
    const col = hint.direction === "row" ? hint.col + index : hint.col;

    return `${row}:${col}`;
  });
}

function getHintPositionedBoardClueCellKeys(hint: BestMoveHint): string[] {
  return getHintRevealedLetterIndexes(hint)
    .map((index) => parseBoardTileKey(hint.tileIds[index]))
    .filter((cellKey): cellKey is string => Boolean(cellKey));
}

function getHintRevealedLetterIndexes(hint: BestMoveHint): number[] {
  return uniqueNumbers([0, hint.word.length - 1, hint.word.length > 1 ? 1 : 0]);
}

function uniqueNumbers(values: number[]): number[] {
  return [...new Set(values)];
}

function createEmptyPreparedSlots(): (string | null)[] {
  return Array.from({ length: PREPARED_SLOT_COUNT }, () => null);
}

function getPreparedSlotTileIds(slots: (string | null)[]): string[] {
  const seenTileIds = new Set<string>();

  return slots.filter((tileId): tileId is string => {
    if (!tileId || seenTileIds.has(tileId)) {
      return false;
    }

    seenTileIds.add(tileId);
    return true;
  });
}

function getLastPreparedTileId(slots: (string | null)[]): string | null {
  for (let index = slots.length - 1; index >= 0; index -= 1) {
    if (slots[index]) {
      return slots[index];
    }
  }

  return null;
}

function getPreparedWordFromTileIds(game: GameState, tileIds: string[]): string {
  return tileIds
    .map((tileId) => getPreparedTile(game, tileId)?.letter ?? "")
    .join("");
}

function removeTileIdFromPreparedSlots(slots: (string | null)[], tileId: string): (string | null)[] {
  return slots.map((currentTileId) => (currentTileId === tileId ? null : currentTileId));
}

function removeBoardTileTokensFromPreparedSlots(slots: (string | null)[]): (string | null)[] {
  return slots.map((tileId) => (tileId && parseBoardTileKey(tileId) ? null : tileId));
}

function packPreparedTileSlots(tileIds: string[]): (string | null)[] {
  const nextSlots = createEmptyPreparedSlots();

  getUniqueTileIds(tileIds)
    .slice(0, PREPARED_SLOT_COUNT)
    .forEach((tileId, index) => {
    nextSlots[index] = tileId;
  });

  return nextSlots;
}

function getUniqueTileIds(tileIds: string[]): string[] {
  const seenTileIds = new Set<string>();

  return tileIds.filter((tileId) => {
    if (seenTileIds.has(tileId)) {
      return false;
    }

    seenTileIds.add(tileId);
    return true;
  });
}

function getFirstEmptySlotIndex(slots: (string | null)[]): number {
  const emptyIndex = slots.findIndex((tileId) => tileId === null);

  return emptyIndex === -1 ? PREPARED_SLOT_COUNT - 1 : emptyIndex;
}

function getAppendPreparedSlotIndex(slots: (string | null)[]): number {
  const lastFilledIndex = slots.reduce((lastIndex, tileId, index) => (tileId ? index : lastIndex), -1);

  if (lastFilledIndex < PREPARED_SLOT_COUNT - 1) {
    return lastFilledIndex + 1;
  }

  return getFirstEmptySlotIndex(slots);
}

function placeTileIdInPreparedSlot(
  slots: (string | null)[],
  tileId: string,
  targetIndex: number,
  game: GameState
): (string | null)[] {
  const normalizedSlots = normalizePreparedSlots(slots);
  const tileExists =
    normalizedSlots.includes(tileId) || game.racks.human.some((tile) => tile.id === tileId) || Boolean(parseBoardTileKey(tileId));

  if (!tileExists) {
    return normalizedSlots;
  }

  const safeTargetIndex = Math.min(Math.max(targetIndex, 0), PREPARED_SLOT_COUNT - 1);
  const nextSlots = removeTileIdFromPreparedSlots(normalizedSlots, tileId);

  if (!nextSlots[safeTargetIndex]) {
    nextSlots[safeTargetIndex] = tileId;
    return nextSlots;
  }

  return insertTileIdInPreparedSlots(nextSlots, tileId, safeTargetIndex);
}

function insertTileIdInPreparedSlots(slots: (string | null)[], tileId: string, targetIndex: number): (string | null)[] {
  const nextSlots = [...slots];

  for (let index = PREPARED_SLOT_COUNT - 1; index > targetIndex; index -= 1) {
    nextSlots[index] = nextSlots[index - 1];
  }

  nextSlots[targetIndex] = tileId;

  return normalizePreparedSlots(nextSlots);
}

function normalizePreparedSlots(slots: (string | null)[]): (string | null)[] {
  const seenTileIds = new Set<string>();

  return slots.map((tileId) => {
    if (!tileId || seenTileIds.has(tileId)) {
      return null;
    }

    seenTileIds.add(tileId);
    return tileId;
  });
}

function sanitizePreparedTileSlots(slots: (string | null)[], game: GameState): (string | null)[] {
  return normalizePreparedSlots(slots).map((tileId) => {
    if (!tileId || !getPreparedTile(game, tileId)) {
      return null;
    }

    return tileId;
  });
}

function getHintRevealedLetterIndexesForLevel(hint: BestMoveHint, level: HintLevel): number[] {
  if (level <= 0) {
    return [];
  }

  if (level === 1) {
    return [0];
  }

  if (level === 2) {
    return uniqueNumbers([0, hint.word.length - 1]);
  }

  return getHintRevealedLetterIndexes(hint);
}

function getHintPreparedTileSlots(hint: BestMoveHint, level: HintLevel): (string | null)[] {
  const slots = createEmptyPreparedSlots();

  if (level <= 0) {
    return slots;
  }

  for (const index of getHintRevealedLetterIndexesForLevel(hint, level)) {
    if (index < slots.length) {
      slots[index] = hint.tileIds[index] ?? null;
    }
  }

  return slots;
}

function getNewScoreWordCellKeys(details: ScoreDetails): string[] {
  return uniqueStrings(
    details.words.flatMap((word) =>
      word.letters
        .filter((letter) => letter.isNew)
        .map((letter) => `${letter.row}:${letter.col}`)
    )
  );
}

function getLastMoveCellKeys(details: ScoreDetails | null, messageText: string): string[] {
  if (!details || !isPlayedMoveMessage(messageText)) {
    return [];
  }

  return getScoreWordCellKeys(details);
}

function isPlayedMoveMessage(messageText: string): boolean {
  return messageText.startsWith("Mot accepté") || messageText.startsWith("Mots acceptés") || messageText.startsWith("Le robot pose");
}

function getBonusAnimationCells(details: ScoreDetails): BoardBonusAnimationCell[] {
  const cells = new Map<string, BoardBonusAnimationCell>();

  details.words.forEach((word) => {
    word.letters.forEach((letter) => {
      if (!letter.isNew || letter.bonus === "plain") {
        return;
      }

      cells.set(`${letter.row}:${letter.col}`, {
        row: letter.row,
        col: letter.col,
        bonus: letter.bonus
      });
    });
  });

  return [...cells.values()];
}

function getBoardScorePreview(details: ScoreDetails | null): BoardScorePreview | null {
  if (!details || details.words.length === 0) {
    return null;
  }

  const cells = new Map<string, { row: number; col: number }>();
  details.words.forEach((word) => {
    word.letters.forEach((letter) => {
      cells.set(`${letter.row}:${letter.col}`, { row: letter.row, col: letter.col });
    });
  });

  if (cells.size === 0) {
    return null;
  }

  const coordinates = [...cells.values()];
  const row = coordinates.reduce((sum, cell) => sum + cell.row, 0) / coordinates.length;
  const col = coordinates.reduce((sum, cell) => sum + cell.col, 0) / coordinates.length;

  return {
    row,
    col,
    score: details.total
  };
}

function getUncommittedCellKeys(game: GameState): string[] {
  return game.board
    .flatMap((row) => row)
    .filter((cell) => cell.tile && !cell.tile.committed)
    .map((cell) => `${cell.row}:${cell.col}`);
}

function ScoreDetailsDisclosure({ details }: { details: ScoreDetails }) {
  return (
    <details className="score-details">
      <summary>Détail du score</summary>
      <div className="score-details-content">
        {details.words.map((word) => (
          <section className="score-word-detail" key={`${word.word}-${word.subtotal}`}>
            <h3>
              {word.word} : {word.subtotal} point{word.subtotal > 1 ? "s" : ""}
            </h3>
            <WordExplanationNote word={word.word} />
            <ul>
              {word.letters.map((letter) => (
                <li key={`${word.word}-${letter.row}-${letter.col}-${letter.letter}`}>
                  {formatLetterScore(letter)}
                </li>
              ))}
            </ul>
            {word.wordMultiplier > 1 ? <p>Bonus mot x{word.wordMultiplier} appliqué.</p> : null}
          </section>
        ))}
        {details.fullRackBonus > 0 ? (
          <p className="score-rack-bonus">Bonus chevalet complet : +{details.fullRackBonus} points.</p>
        ) : null}
        <p className="score-total">
          Total : {details.total} point{details.total > 1 ? "s" : ""}
        </p>
      </div>
    </details>
  );
}

function WordExplanationNote({ word }: { word: string }) {
  const explanation = getWordExplanation(word);

  if (!explanation) {
    return (
      <p className="word-explanation">
        Mot reconnu dans {DICTIONARY_LABEL}. Sa fiche explicative n'est pas encore disponible.
      </p>
    );
  }

  const sourceLabel = explanation.sources
    .map((source) => (source.version ? `${source.name} ${source.version}` : source.name))
    .join(", ");

  return (
    <p className="word-explanation">
      <strong>{explanation.partOfSpeech}</strong> : {formatWordExplanationDefinition(explanation)}
      {explanation.usage ? ` ${explanation.usage}` : ""} <span>Sources : {sourceLabel}.</span>
    </p>
  );
}

function getUniqueScoreWordExplanations(details: ScoreDetails): { word: string; explanation: WordExplanation | null }[] {
  const seenWords = new Set<string>();
  return details.words.flatMap((scoreWord) => {
    if (seenWords.has(scoreWord.word)) {
      return [];
    }

    const explanation = getWordExplanation(scoreWord.word);

    seenWords.add(scoreWord.word);
    return [{ word: scoreWord.word, explanation }];
  });
}

function formatLetterScore(letter: ScoreLetterDetail): string {
  const coordinates = `L${letter.row + 1} C${letter.col + 1}`;
  const base = `${letter.letter} (${coordinates}) : ${letter.points} point${letter.points > 1 ? "s" : ""}`;

  if (!letter.isNew) {
    return `${base}, ${letter.note}.`;
  }

  return `${base}, ${letter.note} (valeur ${letter.value}).`;
}

function getPreparedTile(game: GameState, tileId: string): Tile | null {
  const boardKey = parseBoardTileKey(tileId);
  if (boardKey) {
    const [row, col] = boardKey.split(":").map(Number);
    return game.board[row]?.[col]?.tile ?? null;
  }

  return game.racks.human.find((tile) => tile.id === tileId) ?? getPendingBoardTile(game, tileId);
}

function getPendingBoardTile(game: GameState, tileId: string): Tile | null {
  return (
    game.board
      .flatMap((row) => row)
      .map((cell) => cell.tile)
      .find((tile): tile is PlacedTile => Boolean(tile && !tile.committed && tile.owner === "human" && tile.id === tileId)) ??
    null
  );
}

function parseBoardTileKey(tileId: string): string | null {
  if (!tileId.startsWith("board:")) {
    return null;
  }

  return tileId.slice("board:".length);
}

type PreparedPlacement = {
  row: number;
  col: number;
  direction: PlacementDirection;
  previewCells: BoardPreviewCell[];
};

function findPreparedPlacement(
  game: GameState,
  preparedTileIds: string[],
  preparedWord: string,
  hasHint: boolean
): PreparedPlacement | null {
  if (hasHint || preparedWord.length === 0) {
    return null;
  }

  if (!hasCommittedTileOnBoard(game)) {
    const center = getBoardCenter(game.board);
    return findPreparedPlacementAt(game, preparedTileIds, preparedWord, center, center);
  }

  const anchors = preparedTileIds
    .map((tileId, index) => ({ key: parseBoardTileKey(tileId), index }))
    .filter((anchor): anchor is { key: string; index: number } => Boolean(anchor.key));

  for (const anchor of anchors) {
    const [anchorRow, anchorCol] = anchor.key.split(":").map(Number);
    for (const direction of PLACEMENT_DIRECTIONS) {
      const row = direction === "col" ? anchorRow - anchor.index : anchorRow;
      const col = direction === "row" ? anchorCol - anchor.index : anchorCol;
      const placement = getValidPreparedPlacement(game, preparedTileIds, preparedWord, row, col, direction);

      if (placement) {
        return placement;
      }
    }
  }

  return null;
}

function findPreparedPlacementAt(
  game: GameState,
  preparedTileIds: string[],
  preparedWord: string,
  row: number,
  col: number
): PreparedPlacement | null {
  for (const direction of PLACEMENT_DIRECTIONS) {
    const placement = getValidPreparedPlacement(game, preparedTileIds, preparedWord, row, col, direction);

    if (placement) {
      return placement;
    }
  }

  return null;
}

function getValidPreparedPlacement(
  game: GameState,
  preparedTileIds: string[],
  preparedWord: string,
  row: number,
  col: number,
  direction: PlacementDirection
): PreparedPlacement | null {
  const placement = buildPlacementAt(game, preparedWord, row, col, direction);

  if (!placement || placement.previewCells.length === 0) {
    return null;
  }

  const placedWord = placeWord(game, preparedTileIds, row, col, direction);

  return placedWord.ok ? placement : null;
}

function hasCommittedTileOnBoard(game: GameState): boolean {
  return game.board.some((row) => row.some((cell) => cell.tile?.committed));
}

function buildPlacementAt(
  game: GameState,
  word: string,
  startRow: number,
  startCol: number,
  direction: PlacementDirection
): PreparedPlacement | null {
  const previewCells: BoardPreviewCell[] = [];

  for (const [index, letter] of [...word].entries()) {
    const row = direction === "col" ? startRow + index : startRow;
    const col = direction === "row" ? startCol + index : startCol;
    const cell = game.board[row]?.[col];

    if (!cell) {
      return null;
    }

    if (cell.tile) {
      if (cell.tile.letter !== letter) {
        return null;
      }
      continue;
    }

    previewCells.push({ row, col, letter });
  }

  return {
    row: startRow,
    col: startCol,
    direction,
    previewCells
  };
}

function canValidateCurrentMove(
  game: GameState,
  hint: BestMoveHint | null
): boolean {
  if (game.turn.player !== "human") {
    return false;
  }

  if (hint) {
    return true;
  }

  if (getPlacedTiles(game.board).length > 0) {
    return validateTurn(game.board).ok;
  }

  return false;
}

function getEffectiveComputerSearchProfile(
  preference: "auto" | ComputerSearchProfile,
  recentDurationsMs: number[]
): ComputerSearchProfile {
  if (preference !== "auto") {
    return preference;
  }

  if (recentDurationsMs.length < 2) {
    return "balanced";
  }

  const averageDuration =
    recentDurationsMs.reduce((total, duration) => total + duration, 0) / recentDurationsMs.length;
  const maxDuration = Math.max(...recentDurationsMs);

  if (averageDuration > 1_100 || maxDuration > 1_800) {
    return "safe";
  }

  if (averageDuration < 320 && maxDuration < 650) {
    return "quality";
  }

  return "balanced";
}

function formatDuration(durationMs: number): string {
  return `${Math.round(durationMs)} ms`;
}

function cloneGameState(game: GameState): GameState {
  return JSON.parse(JSON.stringify(game)) as GameState;
}

function cloneHint(hint: BestMoveHint | null): BestMoveHint | null {
  return hint ? (JSON.parse(JSON.stringify(hint)) as BestMoveHint) : null;
}

function cloneBoardPreviewCells(cells: BoardPreviewCell[]): BoardPreviewCell[] {
  return cells.map((cell) => ({ ...cell }));
}

function createButtonHintProps(
  description: string,
  enabled: boolean
): {
  "aria-description": string;
  "data-tooltip"?: string;
} {
  return enabled ? { "aria-description": description, "data-tooltip": description } : { "aria-description": description };
}

function getHintButtonDescription(
  hintMode: "none" | "progressive" | "complete",
  isHintSearching: boolean,
  hint: BestMoveHint | null,
  hintLevel: HintLevel
): string {
  if (hintMode === "none") {
    return "Les indices sont désactivés dans les options.";
  }

  if (isHintSearching) {
    return "Recherche d'un indice en cours.";
  }

  if (hint) {
    if (hintMode === "complete") {
      return "Retire l'indice complet.";
    }

    return hintLevel < MAX_HINT_LEVEL
      ? "Affiche un indice plus précis."
      : "Revient au premier indice sans refaire de recherche.";
  }

  return hintMode === "complete" ? "Donne directement le meilleur mot trouvé." : "Cherche un bon coup possible.";
}

function getUndoButtonDescription(canUndoAction: boolean, usesFullUndoMode: boolean): string {
  if (canUndoAction) {
    return usesFullUndoMode
      ? "Défait la dernière action, même si elle appartient à un tour précédent."
      : "Défait la dernière action du tour en cours.";
  }

  return usesFullUndoMode
    ? "Aucune action à défaire pour le moment."
    : "Aucune action à défaire dans le tour en cours.";
}

function getRedoButtonDescription(canRedoAction: boolean, usesFullUndoMode: boolean): string {
  if (canRedoAction) {
    return usesFullUndoMode
      ? "Refait la dernière action qui vient d'être défaite."
      : "Refait la dernière action défaite dans le tour en cours.";
  }

  return usesFullUndoMode
    ? "Aucune action à refaire pour le moment."
    : "Aucune action à refaire dans le tour en cours.";
}
