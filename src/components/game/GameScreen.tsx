import { useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent, PointerEvent } from "react";
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
  isGameFinished,
  moveHumanTurnWord,
  placeTile,
  placeWord,
  removeHumanTurnTile,
  undoHumanTurn,
  validatePreparedHint,
  validateHumanTurn
} from "../../domain/turns/game";
import type { PlacementDirection } from "../../domain/turns/game";
import type { ComputerSearchProfile, OpponentLevel } from "../../domain/turns/game";
import { getBoardCenter } from "../../domain/tiles/types";
import type { GameState, PlacedTile, ScoreDetails, ScoreLetterDetail, Tile } from "../../domain/tiles/types";
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
  undoMode: "off" | "all-actions";
  hintsEnabled: boolean;
  developerMode: boolean;
  canDecreaseInterfaceScale: boolean;
  canIncreaseInterfaceScale: boolean;
  onDecreaseInterfaceScale: () => void;
  onIncreaseInterfaceScale: () => void;
};

const TILE_DRAG_MIME = "text/serenimot-tile-id";
const TOUCH_DRAG_THRESHOLD_PX = 8;
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

type SelectedBoardCell = {
  row: number;
  col: number;
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
  const usesUndoMode = undoMode === "all-actions";
  const canUndoAction = usesUndoMode && undoHistory.length > 0;
  const canRedoAction = usesUndoMode && redoHistory.length > 0;
  const isCompleteHintVisible = Boolean(hint && hintLevel >= 6);
  const isPartialHintVisible = Boolean(hint && hintLevel > 0 && hintLevel < MAX_HINT_LEVEL);
  const displayedPreparedWord = isCompleteHintVisible ? hint?.word ?? "" : preparedWord || pendingTurnWord?.word || "";
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

  function setPreparedTileIds(nextTileIds: string[] | ((currentTileIds: string[]) => string[])) {
    setPreparedTileSlots((currentSlots) => {
      const currentTileIds = getPreparedSlotTileIds(currentSlots);
      const tileIds = typeof nextTileIds === "function" ? nextTileIds(currentTileIds) : nextTileIds;

      return packPreparedTileSlots(tileIds);
    });
  }

  function pushUndoPoint() {
    if (!usesUndoMode || isFinished) {
      return;
    }

    setUndoHistory((currentHistory) => [...currentHistory.slice(-(UNDO_HISTORY_LIMIT - 1)), createUndoSnapshot()]);
    setRedoHistory([]);
  }

  function clearUndoHistory() {
    setUndoHistory([]);
    setRedoHistory([]);
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
    setIsPendingWordSelected(snapshot.isPendingWordSelected);
    setHint(snapshot.hint);
    setHintLevel(snapshot.hintLevel);
    setErrorPreviewCells(cloneBoardPreviewCells(snapshot.errorPreviewCells));
    setInvalidCellKeys([...snapshot.invalidCellKeys]);
    setFloatingScorePreview(snapshot.floatingScorePreview);
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
    clearHint();
    clearErrorHighlights();
  }, [game.gameId]);

  useEffect(() => {
    if (usesUndoMode) {
      return;
    }

    clearUndoHistory();
  }, [usesUndoMode]);

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
    if (!game.message.scoreDetails || !game.message.text.startsWith("L'ordinateur pose")) {
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
              label: "Ordinateur",
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
              text: "L'ordinateur n'a pas réussi à jouer. À vous de reprendre la main."
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

    clearErrorHighlights();
    const cellTile = game.board[row][col].tile;
    const hasPendingTiles = getPlacedTiles(game.board).length > 0;
    if (cellTile && !cellTile.committed && cellTile.owner === "human" && pendingTurnWord) {
      if (selectedBoardCell) {
        clearHint();
        const result = placeTile(game, cellTile.id, selectedBoardCell.row, selectedBoardCell.col);

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
          setPreparedTileIds(getPendingTurnTileIds(result.state));
          setIsPendingWordSelected(false);
        }
        setSelectedTileId(null);
        setSelectedBoardCell(null);
        setSelectedPreparedSlotIndex(null);
        return;
      }

      clearHint();
      const removedTile = removeHumanTurnTile(game, cellTile.id);

      if (removedTile.ok) {
        pushUndoPoint();
        setPreparedTileIds(getPendingTurnTileIds(removedTile.state));
        setIsPendingWordSelected(false);
        setSelectedBoardCell(null);
        setSelectedPreparedSlotIndex(null);
        onGameChange(removedTile.state);
      }

      setSelectedTileId(null);
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

    if (!selectedTileId && !cellTile && (preparedTileIds.length <= 1 || (hasPendingTiles && !isPendingWordSelected))) {
      setSelectedBoardCell((currentCell) =>
        currentCell?.row === row && currentCell.col === col ? null : { row, col }
      );
      setSelectedPreparedSlotIndex(null);
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
      if (hasPendingTiles && !isPendingWordSelected) {
        onGameChange({
          ...game,
          message: {
            tone: "info",
            text: "Glissez une lettre du coup vers une nouvelle case pour déplacer le mot."
          }
        });
        return;
      }

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
        setPreparedTileIds(getPendingTurnTileIds(result.state));
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
    setSelectedBoardCell(null);
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
      setPreparedTileIds(getPendingTurnTileIds(result.state));
      setIsPendingWordSelected(false);
    }
    setSelectedTileId(null);
  }

  function handleTileDropOnBoard(tileId: string, row: number, col: number) {
    if (isFinished) {
      return;
    }

    clearErrorHighlights();
    clearHint();
    setSelectedBoardCell(null);
    setSelectedPreparedSlotIndex(null);

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
      setPreparedTileIds(getPendingTurnTileIds(result.state));
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
      setPreparedTileIds(getPendingTurnTileIds(removedTile.state));
      setIsPendingWordSelected(false);
      onGameChange(removedTile.state);
    }
    setSelectedTileId(null);
  }

  function handlePendingWordDrop(row: number, col: number, sourceRow?: number, sourceCol?: number) {
    if (isFinished) {
      return;
    }

    setFloatingScorePreview(null);

    if (!pendingTurnWord) {
      return;
    }

    clearErrorHighlights();
    clearHint();
    const anchoredDropCell = getAnchoredPendingWordDropCell(pendingTurnWord, row, col, sourceRow, sourceCol);
    const result = moveHumanTurnWord(game, anchoredDropCell.row, anchoredDropCell.col, pendingTurnWord.direction);

    if (!result.ok) {
      pushUndoPoint();
      const attemptedCells = buildAttemptPreviewCells(
        game,
        pendingTurnWord.word,
        anchoredDropCell.row,
        anchoredDropCell.col,
        pendingTurnWord.direction
      );
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
              text: result.reason
            }
          }
    );
    if (result.ok) {
      setPreparedTileIds(getPendingTurnTileIds(result.state));
      setIsPendingWordSelected(false);
    }
  }

  function handleFloatingWordDrop(row: number, col: number) {
    setFloatingScorePreview(null);

    if (preparedTileIds.length > 0) {
      handleCellClick(row, col);
      return;
    }

    if (!pendingTurnWord) {
      return;
    }

    clearErrorHighlights();
    const result = moveHumanTurnWord(game, row, col, pendingTurnWord.direction);

    if (!result.ok) {
      pushUndoPoint();
      const attemptedCells = buildAttemptPreviewCells(game, pendingTurnWord.word, row, col, pendingTurnWord.direction);
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
              text: result.reason
            }
          }
    );
  }

  function handleFloatingWordDrag(row: number, col: number) {
    setFloatingScorePreview(getFloatingPlacementScore(game, preparedTileIds, pendingTurnWord, row, col, pendingTurnWord?.direction ?? "row"));
  }

  function handleValidate() {
    if (isFinished) {
      return;
    }

    const completeHint = isCompleteHintVisible ? hint : null;

    setSelectedTileId(null);
    setSelectedBoardCell(null);
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
    setSelectedBoardCell(null);
    setSelectedPreparedSlotIndex(null);
    setIsPendingWordSelected(false);
    clearHint();
    clearErrorHighlights();
    pushUndoPoint();
    onGameChange(passHumanTurn(game));
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
    setSelectedBoardCell(null);
    setSelectedPreparedSlotIndex(null);
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

  function revealHintLevel(nextHint: BestMoveHint, nextHintLevel: HintLevel, recordUndo = true) {
    const directionLabel = nextHint.direction === "row" ? "horizontalement" : "verticalement";
    const levelMessage = getHintMessage(nextHint, nextHintLevel, directionLabel, usesProgressiveHints);

    if (recordUndo) {
      pushUndoPoint();
    }

    setHint(nextHint);
    setHintLevel(nextHintLevel);
    setIsPendingWordSelected(false);
    setSelectedTileId(null);
    setSelectedBoardCell(null);
    setSelectedPreparedSlotIndex(null);
    clearErrorHighlights();

    if (nextHintLevel >= MAX_HINT_LEVEL) {
      setPreparedTileSlots(packPreparedTileSlots(nextHint.tileIds));
    } else {
      setPreparedTileSlots(getHintPreparedTileSlots(nextHint, nextHintLevel));
    }

    onGameChange({
      ...game,
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
    pushUndoPoint();
    setIsHintSearching(true);
    clearErrorHighlights();
    onGameChange({
      ...game,
      message: {
        tone: "info",
        text: "L'ordinateur cherche un indice possible."
      }
    });

    const requestId = hintSearchRequestIdRef.current + 1;
    hintSearchRequestIdRef.current = requestId;

    hintSearchTimeoutRef.current = window.setTimeout(() => {
      void findBestHumanMoveAsync(game)
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
              ...game,
              message: {
                tone: "notice",
                text: "Aucun mot possible n'a été trouvé avec le dictionnaire actuel."
              }
            });
            return;
          }

          revealHintLevel(nextHint, hintMode === "complete" ? MAX_HINT_LEVEL : 1, false);
        })
        .catch(() => {
          if (hintSearchRequestIdRef.current !== requestId) {
            return;
          }

          hintSearchTimeoutRef.current = null;
          setIsHintSearching(false);
          onGameChange({
            ...game,
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
      handleTileDropOnBoard(tileId, selectedBoardCell.row, selectedBoardCell.col);
      return;
    }

    const targetIndex = selectedPreparedSlotIndex ?? getAppendPreparedSlotIndex(preparedTileSlots);

    pushUndoPoint();
    setSelectedTileId(null);
    setSelectedBoardCell(null);
    setSelectedPreparedSlotIndex(null);
    clearHint();
    setIsPendingWordSelected(false);
    clearErrorHighlights();
    setPreparedTileSlots((currentSlots) => placeTileIdInPreparedSlot(currentSlots, tileId, targetIndex, game));
  }

  function handleInsertPreparedTile(tileId: string, targetIndex: number) {
    if (isFinished) {
      return;
    }

    pushUndoPoint();
    setSelectedTileId(null);
    setSelectedBoardCell(null);
    setSelectedPreparedSlotIndex(null);
    clearHint();
    setIsPendingWordSelected(false);
    clearErrorHighlights();
    setPreparedTileSlots((currentSlots) => placeTileIdInPreparedSlot(currentSlots, tileId, targetIndex, game));
  }

  function handleMovePreparedTileToEnd(tileId: string) {
    handleInsertPreparedTile(tileId, getAppendPreparedSlotIndex(preparedTileSlots));
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
    setSelectedBoardCell(null);
    setSelectedPreparedSlotIndex(null);
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
      Recherche
    </span>
  ) : hint ? (
    usesProgressiveHints ? `Indice ${hintLevel}/${MAX_HINT_LEVEL}` : "Indice"
  ) : hintMode === "none" ? (
    "Indice désactivé"
  ) : (
    "Indice"
  );

  return (
    <main className="game-layout">
      <header className="game-topbar" aria-label="Actions principales">
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
        <section className="topbar-score-panel" aria-label="Scores">
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
            <span>Ordinateur</span>
            <strong>{game.scores.computer}</strong>
          </div>
          <div>
            <span>Pioche</span>
            <strong>{game.bag.length}</strong>
          </div>
          <div>
            <span>Grille</span>
            <strong>{game.board.length}x{game.board.length}</strong>
          </div>
        </section>
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
      </header>

      <section ref={boardSectionRef} className="game-main" aria-label="Partie en cours">
        <BoardView
          board={game.board}
          selectedBoardCellKey={selectedBoardCell ? `${selectedBoardCell.row}:${selectedBoardCell.col}` : null}
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
          onPendingWordDrop={handlePendingWordDrop}
          onTileDrop={handleTileDropOnBoard}
          onFloatingWordDrag={handleFloatingWordDrag}
          onFloatingWordDragEnd={() => setFloatingScorePreview(null)}
          onFloatingWordDrop={handleFloatingWordDrop}
        />
      </section>

      <aside className="game-side" aria-label="Informations de partie">
        <section className="panel word-builder preparation-zone" aria-labelledby="word-builder-title" aria-live="polite">
          <div className="panel-heading">
            <h2 id="word-builder-title">Zone de préparation</h2>
            {usesUndoMode ? (
              <div className="history-actions" aria-label="Historique des actions">
                <button
                  className="secondary-button icon-action-button"
                  type="button"
                  aria-label="Défaire"
                  onClick={handleUndoAction}
                  disabled={!canUndoAction || game.turn.player !== "human"}
                  {...getButtonHintProps(
                    canUndoAction
                      ? "Défait la dernière action de préparation, de pose ou de validation."
                      : "Aucune action à défaire pour le moment."
                  )}
                >
                  <span aria-hidden="true">↶</span>
                </button>
                <button
                  className="secondary-button icon-action-button"
                  type="button"
                  aria-label="Refaire"
                  onClick={handleRedoAction}
                  disabled={!canRedoAction || game.turn.player !== "human"}
                  {...getButtonHintProps(
                    canRedoAction
                      ? "Refait la dernière action qui vient d'être défaite."
                      : "Aucune action à refaire pour le moment."
                  )}
                >
                  <span aria-hidden="true">↷</span>
                </button>
              </div>
            ) : null}
          </div>
          <RackView
            rack={game.racks.human}
            preparedTileIds={preparedTileIds}
            selectedBoardCell={selectedBoardCell}
            selectedPreparedSlotIndex={selectedPreparedSlotIndex}
            onAddTile={handleAddPreparedTile}
            onBoardDrop={handleTileDropOnBoard}
            onPreparedDrop={(tileId, targetIndex) =>
              targetIndex === null ? handleMovePreparedTileToEnd(tileId) : handleInsertPreparedTile(tileId, targetIndex)
            }
            onDropTile={handleRemovePreparedTile}
          />
          <div className="preparation-subsection">
            <h3>Chevalet</h3>
              <PreparedWordTiles
                displayedWord={displayedPreparedWord}
                tileSlots={preparedTileSlotDetails}
                tileIdSlots={preparedTileSlots}
                selectedSlotIndex={selectedPreparedSlotIndex}
              boardTileKeys={preparedBoardTileKeys}
              onBoardDrop={handleTileDropOnBoard}
              onInsertTile={handleInsertPreparedTile}
              onMoveTileToEnd={handleMovePreparedTileToEnd}
              onRemoveTile={handleRemovePreparedTile}
              onSelectSlot={(slotIndex) => {
                setSelectedBoardCell(null);
                setSelectedPreparedSlotIndex((currentIndex) => (currentIndex === slotIndex ? null : slotIndex));
              }}
            />
          </div>
          <div className="mobile-action-bar" aria-label="Actions rapides">
            <button
              type="button"
              onClick={handleValidate}
              disabled={isFinished || game.turn.player !== "human" || !canValidate}
              {...getButtonHintProps("Valide le coup posé sur le plateau.")}
            >
              Valider
            </button>
            <button
              className={`secondary-button${hint ? " active-action" : ""}${isHintSearching ? " hint-searching-button" : ""}`}
              type="button"
              aria-pressed={Boolean(hint)}
              onClick={handleHint}
              disabled={isHintDisabled}
              {...getButtonHintProps(getHintButtonDescription(hintMode, isHintSearching, hint, hintLevel))}
            >
              {hintButtonContent}
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={handlePass}
              disabled={isFinished || game.turn.player !== "human"}
              {...getButtonHintProps("Passe votre tour et laisse l'ordinateur jouer.")}
            >
              Passer
            </button>
            <button
              className="secondary-button"
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
          </div>
          <div className="builder-actions">
            <button
              type="button"
              onClick={handleValidate}
              disabled={isFinished || game.turn.player !== "human" || !canValidate}
              {...getButtonHintProps("Valide le coup posé sur le plateau.")}
            >
              Valider
            </button>
            <button
              className={`secondary-button${hint ? " active-action" : ""}${isHintSearching ? " hint-searching-button" : ""}`}
              type="button"
              aria-pressed={Boolean(hint)}
              onClick={handleHint}
              disabled={isHintDisabled}
              {...getButtonHintProps(getHintButtonDescription(hintMode, isHintSearching, hint, hintLevel))}
            >
              {hintButtonContent}
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={handlePass}
              disabled={isFinished || game.turn.player !== "human"}
              {...getButtonHintProps("Passe votre tour et laisse l'ordinateur jouer.")}
            >
              Passer
            </button>
            <button
              className="secondary-button"
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
            </div>
          ) : null}
          <p>
            {isHintSearching
              ? "Recherche d'un indice possible..."
              : hint
              ? getHintInstruction(hintLevel, usesProgressiveHints)
              : pendingTurnWord
                ? "Glissez une lettre du mot pour le déplacer, ou validez."
              : displayedPreparedWord
                ? "Touchez une case pour poser le mot, ou glissez les lettres une par une."
              : selectedTile
                ? `Lettre choisie : ${selectedTile.letter}.`
                : "Composez votre mot avant de le poser."}
          </p>
        </section>

        <div className={`message message-${game.message.tone}`}>
          <div className={game.turn.player === "computer" ? "computer-thinking" : undefined} role="status" aria-live="polite">
            {game.turn.player === "computer" ? (
              <>
                <span>L'ordinateur réfléchit</span>
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
            <ScoreWordExplanations details={game.message.scoreDetails} />
          ) : null}
          {game.message.scoreDetails ? (
            <ScoreDetailsDisclosure details={game.message.scoreDetails} />
          ) : null}
        </div>

        <details className="help-panel">
          <summary>Aide</summary>
          <p>
            Touchez les lettres pour préparer un mot, choisissez le sens, puis touchez la case de
            départ sur le plateau. Le premier mot doit passer par la case centrale. Le dictionnaire
            actuel est {DICTIONARY_LABEL} avec {dictionaryWordCount} mots.
          </p>
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
      {finalStatus ? (
        <GameOverDialog status={finalStatus} onNewGameRequest={onNewGameRequest} />
      ) : null}
    </main>
  );
}

function GameOverDialog({
  status,
  onNewGameRequest
}: {
  status: NonNullable<GameState["status"]> & { state: "finished" };
  onNewGameRequest: () => void;
}) {
  const title =
    status.winner === "draw"
      ? "Partie terminée"
      : status.winner === "human"
        ? "Vous gagnez"
        : "L'ordinateur gagne";
  const detail =
    status.reason === "rack-empty"
      ? "La pioche est vide et un chevalet est terminé."
      : "Plus aucun joueur n'a posé de mot après plusieurs tours.";
  const loser =
    status.winner === "draw"
      ? "Égalité"
      : status.winner === "human"
        ? "Perdant : ordinateur"
        : "Perdant : vous";

  return (
    <div className="game-over-backdrop" role="presentation">
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
            <span>Ordinateur</span>
            <strong>{status.finalScores.computer}</strong>
          </div>
        </div>
        <p className="game-over-loser">{loser}</p>
        <button type="button" onClick={onNewGameRequest}>
          Nouvelle partie
        </button>
      </section>
    </div>
  );
}

function PreparedWordTiles({
  displayedWord,
  tileSlots,
  tileIdSlots,
  selectedSlotIndex,
  boardTileKeys,
  onBoardDrop,
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
  onBoardDrop: (tileId: string, row: number, col: number) => void;
  onInsertTile: (tileId: string, targetIndex: number) => void;
  onMoveTileToEnd: (tileId: string) => void;
  onRemoveTile: (tileId: string) => void;
  onSelectSlot: (slotIndex: number) => void;
}) {
  const [dropIndicatorIndex, setDropIndicatorIndex] = useState<number | null>(null);
  const [touchDrag, setTouchDrag] = useState<PreparedTouchDragState | null>(null);
  const touchDragRef = useRef<PreparedTouchDragState | null>(null);
  const ignoreNextClickRef = useRef(false);
  const hasPreparedTiles = tileSlots.some(Boolean);

  function handleTilePointerDown(
    event: PointerEvent<HTMLButtonElement>,
    tileId: string,
    tile: Tile
  ) {
    if (event.pointerType === "mouse") {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    const nextDrag = {
      tileId,
      letter: tile.letter,
      value: tile.value,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      x: event.clientX,
      y: event.clientY,
      active: false
    };
    touchDragRef.current = nextDrag;
    setTouchDrag(nextDrag);
  }

  function handleTilePointerMove(event: PointerEvent<HTMLButtonElement>) {
    const currentDrag = touchDragRef.current;

    if (!currentDrag || currentDrag.pointerId !== event.pointerId) {
      return;
    }

    const distance = Math.hypot(event.clientX - currentDrag.startX, event.clientY - currentDrag.startY);
    const active = currentDrag.active || distance >= TOUCH_DRAG_THRESHOLD_PX;

    if (active) {
      event.preventDefault();
      ignoreNextClickRef.current = true;
    }

    const target = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest(".prepared-word-slot, .prepared-word-tile");
    const targetIndex = Number((target as HTMLElement | null)?.dataset.slotIndex);
    setDropIndicatorIndex(Number.isInteger(targetIndex) ? targetIndex : null);

    const nextDrag = {
      ...currentDrag,
      x: event.clientX,
      y: event.clientY,
      active
    };
    touchDragRef.current = nextDrag;
    setTouchDrag(nextDrag);
  }

  function handleTilePointerUp(event: PointerEvent<HTMLButtonElement>) {
    const currentDrag = touchDragRef.current;

    if (!currentDrag || currentDrag.pointerId !== event.pointerId) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    touchDragRef.current = null;
    setTouchDrag(null);
    setDropIndicatorIndex(null);

    if (!currentDrag.active) {
      return;
    }

    event.preventDefault();
    ignoreNextClickRef.current = true;
    const boardCell = document.elementFromPoint(event.clientX, event.clientY)?.closest(".board-cell");
    const row = Number((boardCell as HTMLElement | null)?.dataset.row);
    const col = Number((boardCell as HTMLElement | null)?.dataset.col);

    if (Number.isInteger(row) && Number.isInteger(col)) {
      onBoardDrop(currentDrag.tileId, row, col);
      return;
    }

    const target = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest(".prepared-word-slot, .prepared-word-tile, .prepared-word, .rack");
    const targetIndex = Number((target as HTMLElement | null)?.dataset.slotIndex);

    if (Number.isInteger(targetIndex)) {
      onInsertTile(currentDrag.tileId, targetIndex);
      return;
    }

    if (target?.classList.contains("rack")) {
      onRemoveTile(currentDrag.tileId);
      return;
    }

    if (target?.classList.contains("prepared-word")) {
      onMoveTileToEnd(currentDrag.tileId);
    }
  }

  return (
    <>
      <div
        className={`prepared-word prepared-word-tiles prepared-word-slots${hasPreparedTiles ? "" : " prepared-word-empty"}`}
        aria-label={displayedWord ? `Chevalet ${displayedWord}` : "Chevalet vide"}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setDropIndicatorIndex(null);
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDropIndicatorIndex(null);
          const tileId = getDraggedTileId(event);

          if (tileId) {
            onMoveTileToEnd(tileId);
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
                className={`prepared-word-slot${dropIndicatorIndex === index ? " prepared-word-slot-drop-target" : ""}${isSelectedSlot ? " prepared-word-slot-selected" : ""}`}
                key={`slot-${index}`}
                type="button"
                data-slot-index={index}
                aria-label={
                  isSelectedSlot
                    ? `Emplacement vide ${index + 1}, sélectionné`
                    : `Emplacement vide ${index + 1}`
                }
                aria-pressed={isSelectedSlot}
                onClick={() => onSelectSlot(index)}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDropIndicatorIndex(index);
                }}
                onDragLeave={() => setDropIndicatorIndex(null)}
                onDrop={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setDropIndicatorIndex(null);
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
              className={`prepared-word-tile${isBoardTile ? " prepared-word-tile-board" : ""}${dropIndicatorIndex === index ? " prepared-word-slot-drop-target" : ""}`}
              draggable
              key={tileId}
              type="button"
              data-slot-index={index}
              aria-label={`${isBoardTile ? "Lettre du plateau" : "Retirer la lettre"} ${tile.letter} du chevalet`}
              title={isBoardTile ? "Lettre déjà sur le plateau" : "Remettre dans vos lettres"}
              onClick={() => {
                if (ignoreNextClickRef.current) {
                  ignoreNextClickRef.current = false;
                  return;
                }

                if (selectedSlotIndex !== null) {
                  onInsertTile(tileId, selectedSlotIndex);
                  return;
                }

                onRemoveTile(tileId);
              }}
              onDragStart={(event) => {
                event.dataTransfer.setData(TILE_DRAG_MIME, tileId);
                event.dataTransfer.setData("text/plain", tileId);
                event.dataTransfer.effectAllowed = "move";
              }}
              onDragEnd={() => setDropIndicatorIndex(null)}
              onDragOver={(event) => {
                event.preventDefault();
                setDropIndicatorIndex(index);
              }}
              onDrop={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setDropIndicatorIndex(null);
                const tileId = getDraggedTileId(event);

                if (tileId) {
                  onInsertTile(tileId, index);
                }
              }}
              onPointerDown={(event) => handleTilePointerDown(event, tileId, tile)}
              onPointerMove={handleTilePointerMove}
              onPointerCancel={() => {
                touchDragRef.current = null;
                setTouchDrag(null);
                setDropIndicatorIndex(null);
              }}
              onPointerUp={handleTilePointerUp}
            >
              <span>{tile.letter}</span>
              <small>{tile.value}</small>
            </button>
          );
        })}
      </div>
      {touchDrag?.active ? (
        <span
          className="touch-drag-tile"
          style={{ left: `${touchDrag.x}px`, top: `${touchDrag.y}px` }}
          aria-hidden="true"
        >
          <span>{touchDrag.letter}</span>
          <small>{touchDrag.value}</small>
        </span>
      ) : null}
    </>
  );
}

type PreparedTouchDragState = {
  tileId: string;
  letter: string;
  value: number;
  pointerId: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
  active: boolean;
};

function getDraggedTileId(event: DragEvent<HTMLElement>): string {
  return event.dataTransfer.getData(TILE_DRAG_MIME) || event.dataTransfer.getData("text/plain");
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
    <section className="score-word-explanations" aria-label="Pourquoi ce mot est accepté">
      <h3>Pourquoi ce mot est accepté ?</h3>
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
      <strong>{word}</strong>
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
  const placedTiles = game.board
    .flatMap((row) => row)
    .map((cell) => cell.tile)
    .filter((tile): tile is PlacedTile => Boolean(tile && !tile.committed));

  if (placedTiles.length === 0) {
    return null;
  }

  const sameRow = placedTiles.every((tile) => tile.row === placedTiles[0].row);
  const direction: PlacementDirection = sameRow ? "row" : "col";
  const orderedTiles = [...placedTiles].sort((first, second) =>
    direction === "row" ? first.col - second.col : first.row - second.row
  );

  return {
    word: orderedTiles.map((tile) => tile.letter).join(""),
    direction,
    row: orderedTiles[0].row,
    col: orderedTiles[0].col
  };
}

function getAnchoredPendingWordDropCell(
  pendingTurnWord: BoardFloatingWord,
  targetRow: number,
  targetCol: number,
  sourceRow?: number,
  sourceCol?: number
): { row: number; col: number } {
  if (typeof sourceRow !== "number" || typeof sourceCol !== "number") {
    return { row: targetRow, col: targetCol };
  }

  const offset =
    pendingTurnWord.direction === "row"
      ? sourceCol - (pendingTurnWord.col ?? sourceCol)
      : sourceRow - (pendingTurnWord.row ?? sourceRow);

  if (!Number.isInteger(offset) || offset < 0 || offset >= pendingTurnWord.word.length) {
    return { row: targetRow, col: targetCol };
  }

  return pendingTurnWord.direction === "row"
    ? { row: targetRow, col: targetCol - offset }
    : { row: targetRow - offset, col: targetCol };
}

function getFloatingPlacementScore(
  game: GameState,
  preparedTileIds: string[],
  pendingTurnWord: BoardFloatingWord | null,
  row: number,
  col: number,
  direction: PlacementDirection
): number | null {
  const result =
    preparedTileIds.length > 0
      ? placeWord(game, preparedTileIds, row, col, direction)
      : pendingTurnWord
        ? moveHumanTurnWord(game, row, col, direction)
        : null;

  if (!result?.ok) {
    return null;
  }

  const validation = validateTurn(result.state.board);
  if (!validation.ok) {
    return null;
  }

  return explainTurnScore(result.state.board, validation.words, getPlacedTiles(result.state.board)).total;
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
    return `"${hint.word}" ${directionLabel}, départ ligne ${hint.row + 1}, colonne ${hint.col + 1}, pour ${scoreLabel}. Appuyez sur Valider pour le jouer.`;
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

  return `Indice 6/${MAX_HINT_LEVEL} : "${hint.word}" ${directionLabel}, départ ligne ${hint.row + 1}, colonne ${hint.col + 1}, pour ${scoreLabel}. Appuyez sur Valider pour le jouer.`;
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
    return "Indice 5/6 : l'explication du mot est donnée si elle existe.";
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

  return `${explanation.partOfSpeech} : ${formatWordExplanationDefinition(explanation)}${explanation.usage ? ` ${explanation.usage}` : ""}`;
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
  return slots.filter((tileId): tileId is string => Boolean(tileId));
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

  tileIds.slice(0, PREPARED_SLOT_COUNT).forEach((tileId, index) => {
    nextSlots[index] = tileId;
  });

  return nextSlots;
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
  const tileExists = slots.includes(tileId) || game.racks.human.some((tile) => tile.id === tileId) || Boolean(parseBoardTileKey(tileId));

  if (!tileExists) {
    return slots;
  }

  const nextSlots = [...slots];
  const safeTargetIndex = Math.min(Math.max(targetIndex, 0), PREPARED_SLOT_COUNT - 1);
  const currentIndex = nextSlots.indexOf(tileId);

  if (currentIndex !== -1) {
    nextSlots[currentIndex] = null;
  }

  if (nextSlots[safeTargetIndex] && nextSlots[safeTargetIndex] !== tileId) {
    const displacedTileId = nextSlots[safeTargetIndex];
    const fallbackIndex = getFirstEmptySlotIndex(nextSlots);

    nextSlots[fallbackIndex] = displacedTileId;
  }

  nextSlots[safeTargetIndex] = tileId;
  return nextSlots;
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
  return messageText.startsWith("Mot accepté") || messageText.startsWith("Mots acceptés") || messageText.startsWith("L'ordinateur pose");
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

function getPendingTurnTileIds(game: GameState): string[] {
  const placedTiles = game.board
    .flatMap((row) => row)
    .map((cell) => cell.tile)
    .filter((tile): tile is PlacedTile => Boolean(tile && !tile.committed && tile.owner === "human"));

  if (placedTiles.length === 0) {
    return [];
  }

  const mainWordTileIds = getBestMainTurnTileIds(game, placedTiles);

  return mainWordTileIds ?? getSortedPendingTileIds(placedTiles);
}

function getBestMainTurnTileIds(game: GameState, placedTiles: PlacedTile[]): string[] | null {
  const candidates = (["row", "col"] as const)
    .map((direction) => getMainTurnTileIds(game, placedTiles[0].row, placedTiles[0].col, direction))
    .filter((tileIds) => pendingTileIdsAreIncluded(tileIds, placedTiles));

  if (candidates.length === 0) {
    return null;
  }

  const meaningfulCandidates = candidates.filter((tileIds) => tileIds.length > 1);

  if (meaningfulCandidates.length === 1) {
    return meaningfulCandidates[0];
  }

  if (meaningfulCandidates.length > 1) {
    const [first, second] = [...meaningfulCandidates].sort((a, b) => b.length - a.length);
    return first.length > second.length ? first : null;
  }

  return candidates[0];
}

function pendingTileIdsAreIncluded(tileIds: string[], placedTiles: PlacedTile[]): boolean {
  return placedTiles.every((tile) => tileIds.includes(tile.id));
}

function getMainTurnTileIds(game: GameState, anchorRow: number, anchorCol: number, direction: PlacementDirection): string[] {
  let row = anchorRow;
  let col = anchorCol;

  while (direction === "row" ? game.board[row]?.[col - 1]?.tile : game.board[row - 1]?.[col]?.tile) {
    if (direction === "row") {
      col -= 1;
    } else {
      row -= 1;
    }
  }

  const tileIds: string[] = [];
  while (game.board[row]?.[col]?.tile) {
    const tile = game.board[row][col].tile;

    if (tile?.committed) {
      tileIds.push(createBoardTileToken(row, col));
    } else if (tile?.owner === "human") {
      tileIds.push(tile.id);
    }

    if (direction === "row") {
      col += 1;
    } else {
      row += 1;
    }
  }

  return tileIds;
}

function getSortedPendingTileIds(placedTiles: PlacedTile[]): string[] {
  const sameRow = placedTiles.every((tile) => tile.row === placedTiles[0].row);

  return [...placedTiles]
    .sort((first, second) => (sameRow ? first.col - second.col : first.row - second.row))
    .map((tile) => tile.id);
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
