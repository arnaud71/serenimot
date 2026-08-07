import { cloneBoard, createBoard, isInsideBoard } from "../board/board";
import {
  getDictionaryWordsByLength,
  getDictionaryWordsContainingLetter,
  getDictionaryWordsContainingLetterByLength
} from "../rules/dictionary";
import { explainTurnScore } from "../scoring/scoring";
import { createBag, createDemoBag, drawTiles, refillRack, shuffleTiles } from "../tiles/bag";
import {
  Board,
  BoardSize,
  GameEndReason,
  GameStats,
  GameState,
  PlacementResult,
  PlacedTile,
  PlayerId,
  RACK_SIZE,
  Rack,
  Tile
} from "../tiles/types";
import { getPlacedTiles, validateTurn } from "../rules/validation";
import type { TurnWord } from "../rules/validation";
import { findBestHumanMove } from "./hints";
import type { BestMoveHint } from "./hints";

export type PlacementDirection = "row" | "col";
export type OpponentLevel = "very-easy" | "easy" | "normal" | "hard" | "expert";
export type ComputerSearchProfile = "safe" | "balanced" | "quality";

export type ComputerSearchOptions = {
  profile?: ComputerSearchProfile;
};

type NewGameOptions = {
  useDemoBag?: boolean;
  boardSize?: BoardSize;
  random?: () => number;
  remainingBagSize?: number;
};

const BOARD_TILE_TOKEN_PREFIX = "board:";
const MAX_CONSECUTIVE_PASSES = 4;

export function createBoardTileToken(row: number, col: number): string {
  return `${BOARD_TILE_TOKEN_PREFIX}${row}:${col}`;
}

export function createEmptyGameStats(): GameStats {
  return {
    humanTurns: 0,
    computerTurns: 0,
    passes: 0,
    exchanges: 0,
    hints: {
      partial: 0,
      complete: 0
    }
  };
}

export function getGameStats(state: GameState): GameStats {
  return {
    ...createEmptyGameStats(),
    ...state.stats,
    hints: {
      ...createEmptyGameStats().hints,
      ...state.stats?.hints
    }
  };
}

export function recordHumanHintUse(state: GameState, kind: "partial" | "complete"): GameState {
  if (isGameFinished(state)) {
    return state;
  }

  const stats = getGameStats(state);

  return {
    ...state,
    stats: {
      ...stats,
      hints: {
        ...stats.hints,
        [kind]: stats.hints[kind] + 1
      }
    }
  };
}

export function createNewGame(options: NewGameOptions = {}): GameState {
  const initialBag = options.useDemoBag ? createDemoBag() : shuffleTiles(createBag(), options.random);
  const humanDraw = drawTiles(initialBag, RACK_SIZE);
  const computerDraw = drawTiles(humanDraw.bag, RACK_SIZE);
  const remainingBag =
    typeof options.remainingBagSize === "number" ? computerDraw.bag.slice(0, options.remainingBagSize) : computerDraw.bag;

  return {
    gameId: crypto.randomUUID(),
    board: createBoard(options.boardSize),
    bag: remainingBag,
    racks: {
      human: humanDraw.drawn,
      computer: computerDraw.drawn
    },
    scores: {
      human: 0,
      computer: 0
    },
    turn: {
      player: "human",
      placedTileIds: []
    },
    passCount: 0,
    stats: createEmptyGameStats(),
    status: { state: "playing" },
    message: {
      tone: "info",
      text: "À vous de jouer."
    }
  };
}

export function placeTile(state: GameState, tileId: string, row: number, col: number): PlacementResult {
  if (isGameFinished(state)) {
    return { ok: false, reason: "La partie est terminée.", state };
  }

  if (!isInsideBoard(row, col, state.board.length)) {
    return { ok: false, reason: "Cette case n'existe pas.", state };
  }

  const board = cloneBoard(state.board);
  const tile = state.racks.human.find((candidate) => candidate.id === tileId);
  const pendingTileCell = findPendingHumanTurnTileCell(board, tileId);

  if (!tile) {
    if (!pendingTileCell?.tile) {
      return { ok: false, reason: "Cette lettre n'est plus disponible.", state };
    }

    if (board[row][col].tile && board[row][col].tile?.id !== tileId) {
      return { ok: false, reason: "Cette case contient déjà une lettre.", state };
    }

    const movedTile = {
      ...pendingTileCell.tile,
      row,
      col
    };
    pendingTileCell.tile = null;
    board[row][col].tile = movedTile;

    return {
      ok: true,
      state: {
        ...state,
        board,
        message: {
          tone: "info",
          text: "La lettre a été déplacée. Vous pouvez valider ou modifier votre coup."
        }
      }
    };
  }

  if (state.board[row][col].tile) {
    return { ok: false, reason: "Cette case contient déjà une lettre.", state };
  }

  board[row][col].tile = {
    ...tile,
    row,
    col,
    owner: "human",
    committed: false
  };

  return {
    ok: true,
    state: {
      ...state,
      board,
      racks: {
        ...state.racks,
        human: state.racks.human.filter((candidate) => candidate.id !== tileId)
      },
      turn: {
        player: "human",
        placedTileIds: [...state.turn.placedTileIds, tileId]
      },
      message: {
        tone: "info",
        text: "La lettre est posée. Vous pouvez valider ou modifier votre coup."
      }
    }
  };
}

function findPendingHumanTurnTileCell(board: Board, tileId: string): { tile: PlacedTile | null } | null {
  for (const row of board) {
    for (const cell of row) {
      if (cell.tile && !cell.tile.committed && cell.tile.owner === "human" && cell.tile.id === tileId) {
        return cell;
      }
    }
  }

  return null;
}

export function placeWord(
  state: GameState,
  tileIds: string[],
  row: number,
  col: number,
  direction: PlacementDirection
): PlacementResult {
  if (isGameFinished(state)) {
    return { ok: false, reason: "La partie est terminée.", state };
  }

  if (tileIds.length === 0) {
    return { ok: false, reason: "Préparez un mot avant de choisir une case.", state };
  }

  const board = cloneBoard(state.board);
  const rackAfterPlacement = [...state.racks.human];
  const placedTileIds = [...state.turn.placedTileIds];
  const pendingTilesToMove = new Map<string, PlacedTile>();

  for (const tileId of tileIds) {
    if (parseBoardTileToken(tileId) || rackAfterPlacement.some((tile) => tile.id === tileId)) {
      continue;
    }

    const pendingTileCell = findPendingHumanTurnTileCell(board, tileId);
    if (pendingTileCell?.tile) {
      pendingTilesToMove.set(tileId, pendingTileCell.tile);
      pendingTileCell.tile = null;
    }
  }

  for (let index = 0; index < tileIds.length; index += 1) {
    const targetRow = direction === "col" ? row + index : row;
    const targetCol = direction === "row" ? col + index : col;

    if (!isInsideBoard(targetRow, targetCol, board.length)) {
      return { ok: false, reason: "Le mot dépasse du plateau.", state };
    }

    const boardToken = parseBoardTileToken(tileIds[index]);
    if (boardToken) {
      const selectedBoardTile = board[boardToken.row]?.[boardToken.col]?.tile;
      if (!selectedBoardTile) {
        return { ok: false, reason: "Une lettre préparée n'est plus disponible.", state };
      }

      if (boardToken.row !== targetRow || boardToken.col !== targetCol) {
        return {
          ok: false,
          reason: "La lettre choisie sur le plateau n'est pas placée au bon endroit dans le mot.",
          state
        };
      }

      if (!selectedBoardTile.committed) {
        return { ok: false, reason: "Seules les lettres déjà validées du plateau peuvent servir de repère.", state };
      }
    }

    const selectedTile = boardToken
      ? board[boardToken.row]?.[boardToken.col]?.tile
      : rackAfterPlacement.find((tile) => tile.id === tileIds[index]) ?? pendingTilesToMove.get(tileIds[index]);
    if (!selectedTile) {
      return { ok: false, reason: "Une lettre préparée n'est plus disponible.", state };
    }

    if (board[targetRow][targetCol].tile) {
      if (!board[targetRow][targetCol].tile?.committed) {
        return { ok: false, reason: "Une des cases contient déjà une lettre du coup en cours.", state };
      }

      if (board[targetRow][targetCol].tile?.letter !== selectedTile.letter) {
        return {
          ok: false,
          reason: "Une lettre préparée ne correspond pas à la lettre déjà présente sur le plateau.",
          state
        };
      }

      continue;
    }

    const rackIndex = rackAfterPlacement.findIndex((tile) => tile.id === tileIds[index]);
    const [tile] = rackIndex >= 0 ? rackAfterPlacement.splice(rackIndex, 1) : [selectedTile];
    board[targetRow][targetCol].tile = {
      ...tile,
      row: targetRow,
      col: targetCol,
      owner: "human",
      committed: false
    };
    if (!placedTileIds.includes(tile.id)) {
      placedTileIds.push(tile.id);
    }
  }

  const validation = validateTurn(board);
  if (!validation.ok) {
    return { ok: false, reason: validation.reason, state };
  }

  return {
    ok: true,
    state: {
      ...state,
      board,
      racks: {
        ...state.racks,
        human: rackAfterPlacement
      },
      turn: {
        player: "human",
        placedTileIds
      },
      message: {
        tone: "info",
        text: "Le mot est posé. Vous pouvez valider ou reprendre votre coup."
      }
    }
  };
}

export function moveHumanTurnWord(
  state: GameState,
  row: number,
  col: number,
  direction: PlacementDirection
): PlacementResult {
  if (isGameFinished(state)) {
    return { ok: false, reason: "La partie est terminée.", state };
  }

  const placedTiles = getPlacedTiles(state.board);

  if (placedTiles.length === 0) {
    return { ok: false, reason: "Aucun mot posé n'est à déplacer.", state };
  }

  const sameRow = placedTiles.every((tile) => tile.row === placedTiles[0].row);
  const orderedTiles = [...placedTiles].sort((first, second) =>
    sameRow ? first.col - second.col : first.row - second.row
  );
  const restoredState = undoHumanTurn({
    ...state,
    message: state.message
  });

  return placeWord(
    restoredState,
    orderedTiles.map((tile) => tile.id),
    row,
    col,
    direction
  );
}

export function undoHumanTurn(state: GameState): GameState {
  if (isGameFinished(state)) {
    return state;
  }

  const board = cloneBoard(state.board);
  const returnedTiles: Tile[] = [];

  for (const row of board) {
    for (const cell of row) {
      if (cell.tile && !cell.tile.committed && cell.tile.owner === "human") {
        returnedTiles.push(stripPlacement(cell.tile));
        cell.tile = null;
      }
    }
  }

  return {
    ...state,
    board,
    racks: {
      ...state.racks,
      human: [...state.racks.human, ...returnedTiles]
    },
    turn: {
      player: "human",
      placedTileIds: []
    },
    message: {
      tone: "info",
      text: "Votre coup a été repris."
    }
  };
}

export function removeHumanTurnTile(state: GameState, tileId: string): PlacementResult {
  if (isGameFinished(state)) {
    return { ok: false, reason: "La partie est terminée.", state };
  }

  const board = cloneBoard(state.board);

  for (const row of board) {
    for (const cell of row) {
      if (cell.tile && !cell.tile.committed && cell.tile.owner === "human" && cell.tile.id === tileId) {
        const returnedTile = stripPlacement(cell.tile);
        cell.tile = null;

        return {
          ok: true,
          state: {
            ...state,
            board,
            racks: {
              ...state.racks,
              human: [...state.racks.human, returnedTile]
            },
            turn: {
              player: "human",
              placedTileIds: state.turn.placedTileIds.filter((placedTileId) => placedTileId !== tileId)
            },
            message: {
              tone: "info",
              text: "La lettre a été retirée du plateau."
            }
          }
        };
      }
    }
  }

  return { ok: false, reason: "Cette lettre n'est pas posée sur le plateau.", state };
}

export function validateHumanTurn(state: GameState): GameState {
  if (isGameFinished(state)) {
    return state;
  }

  const validation = validateTurn(state.board);

  if (!validation.ok) {
    return {
      ...state,
      message: {
        tone: "notice",
        text: `${validation.reason} Vous pouvez modifier les lettres ou reprendre votre coup.`
      }
    };
  }

  const placedTiles = getPlacedTiles(state.board);
  const scoreDetails = explainTurnScore(state.board, validation.words, placedTiles);
  const score = scoreDetails.total;
  const board = commitPlacedTiles(state.board, "human");
  const refill = refillRack(state.racks.human, state.bag, RACK_SIZE);

  return finishGameIfNeeded({
    ...state,
    board,
    bag: refill.bag,
    racks: {
      ...state.racks,
      human: refill.rack
    },
    scores: {
      ...state.scores,
      human: state.scores.human + score
    },
    stats: {
      ...getGameStats(state),
      humanTurns: getGameStats(state).humanTurns + 1
    },
    turn: {
      player: "computer",
      placedTileIds: []
    },
    passCount: 0,
    message: {
      tone: "success",
      text: `Mot${validation.words.length > 1 ? "s" : ""} accepté${validation.words.length > 1 ? "s" : ""} : ${validation.words.map((word) => word.word).join(", ")}. Vous marquez ${score} point${score > 1 ? "s" : ""}.`,
      scoreDetails
    }
  });
}

export function validatePreparedHint(state: GameState, hint: BestMoveHint): GameState {
  if (isGameFinished(state)) {
    return state;
  }

  const scoreDetails = explainTurnScore(hint.board, hint.words, hint.placedTiles);
  const score = scoreDetails.total;
  const board = commitPlacedTiles(hint.board, "human");
  const refill = refillRack(hint.rackAfterMove, state.bag, RACK_SIZE);

  return finishGameIfNeeded({
    ...state,
    board,
    bag: refill.bag,
    racks: {
      ...state.racks,
      human: refill.rack
    },
    scores: {
      ...state.scores,
      human: state.scores.human + score
    },
    stats: {
      ...getGameStats(state),
      humanTurns: getGameStats(state).humanTurns + 1
    },
    turn: {
      player: "computer",
      placedTileIds: []
    },
    passCount: 0,
    message: {
      tone: "success",
      text: `Mot${hint.words.length > 1 ? "s" : ""} accepté${hint.words.length > 1 ? "s" : ""} : ${hint.words.map((word) => word.word).join(", ")}. Vous marquez ${score} point${score > 1 ? "s" : ""}.`,
      scoreDetails
    }
  });
}

export function passHumanTurn(state: GameState): GameState {
  if (isGameFinished(state)) {
    return state;
  }

  return finishGameIfNeeded({
    ...undoHumanTurn(state),
    passCount: state.passCount + 1,
    stats: {
      ...getGameStats(state),
      passes: getGameStats(state).passes + 1
    },
    turn: {
      player: "computer",
      placedTileIds: []
    },
    message: {
      tone: "info",
      text: "Vous passez votre tour. L'ordinateur va jouer calmement."
    }
  });
}

export function exchangeHumanTiles(
  state: GameState,
  tileIds: string[],
  random: () => number = Math.random
): PlacementResult {
  if (isGameFinished(state)) {
    return { ok: false, reason: "La partie est terminée.", state };
  }

  if (state.turn.player !== "human") {
    return { ok: false, reason: "Ce n'est pas à vous de jouer.", state };
  }

  const uniqueTileIds = [...new Set(tileIds)];

  if (uniqueTileIds.length === 0) {
    return { ok: false, reason: "Choisissez au moins une lettre à échanger.", state };
  }

  const restoredState = undoHumanTurn(state);
  const selectedTiles = uniqueTileIds
    .map((tileId) => restoredState.racks.human.find((tile) => tile.id === tileId))
    .filter((tile): tile is Tile => Boolean(tile));

  if (selectedTiles.length !== uniqueTileIds.length) {
    return { ok: false, reason: "Une lettre choisie n'est plus disponible.", state };
  }

  if (restoredState.bag.length < selectedTiles.length) {
    return {
      ok: false,
      reason: "La pioche ne permet plus d'échanger autant de lettres. Essayez de poser un mot ou passez votre tour.",
      state
    };
  }

  const selectedTileIds = new Set(uniqueTileIds);
  const keptRack = restoredState.racks.human.filter((tile) => !selectedTileIds.has(tile.id));
  const draw = drawTiles(restoredState.bag, selectedTiles.length);
  const nextBag = shuffleTiles([...draw.bag, ...selectedTiles], random);
  const count = selectedTiles.length;

  return {
    ok: true,
    state: finishGameIfNeeded({
      ...restoredState,
      bag: nextBag,
      racks: {
        ...restoredState.racks,
        human: [...keptRack, ...draw.drawn]
      },
      turn: {
        player: "computer",
        placedTileIds: []
      },
      passCount: restoredState.passCount + 1,
      stats: {
        ...getGameStats(restoredState),
        exchanges: getGameStats(restoredState).exchanges + 1,
        passes: getGameStats(restoredState).passes + 1
      },
      message: {
        tone: "info",
        text: `Vous échangez ${count} lettre${count > 1 ? "s" : ""}. L'ordinateur va jouer calmement.`
      }
    })
  };
}

export function playComputerTurn(
  state: GameState,
  level: OpponentLevel = "easy",
  options: ComputerSearchOptions = {}
): GameState {
  return playAutomatedTurn(state, "computer", level, options);
}

export function playAutomatedTurn(
  state: GameState,
  player: PlayerId,
  level: OpponentLevel = "easy",
  options: ComputerSearchOptions = {}
): GameState {
  if (isGameFinished(state)) {
    return state;
  }

  const nextPlayer = getNextPlayer(player);
  const move = findComputerMove(state, level, player, options);

  if (!move) {
    return finishGameIfNeeded({
      ...state,
      turn: {
        player: nextPlayer,
        placedTileIds: []
      },
      passCount: state.passCount + 1,
      stats: {
        ...getGameStats(state),
        passes: getGameStats(state).passes + 1
      },
      message: {
        tone: "info",
        text:
          player === "computer"
            ? "L'ordinateur passe son tour. À vous de jouer."
            : "Le joueur automatique passe son tour."
      }
    });
  }

  const scoreDetails = explainTurnScore(move.board, move.words, move.placedTiles);
  const score = scoreDetails.total;
  const board = commitPlacedTiles(move.board, player);
  const refill = refillRack(move.rackAfterMove, state.bag, RACK_SIZE);

  return finishGameIfNeeded({
    ...state,
    board,
    bag: refill.bag,
    racks: {
      ...state.racks,
      [player]: refill.rack
    },
    scores: {
      ...state.scores,
      [player]: state.scores[player] + score
    },
    stats: {
      ...getGameStats(state),
      computerTurns: player === "computer" ? getGameStats(state).computerTurns + 1 : getGameStats(state).computerTurns,
      humanTurns: player === "human" ? getGameStats(state).humanTurns + 1 : getGameStats(state).humanTurns
    },
    turn: {
      player: nextPlayer,
      placedTileIds: []
    },
    passCount: 0,
    message: {
      tone: "info",
      text:
        player === "computer"
          ? `L'ordinateur pose "${move.word}" et marque ${score} point${score > 1 ? "s" : ""}. À vous de jouer.`
          : `Le joueur automatique pose "${move.word}" et marque ${score} point${score > 1 ? "s" : ""}.`,
      scoreDetails
    }
  });
}

export function playEasyComputerTurn(state: GameState): GameState {
  return playComputerTurn(state, "easy");
}

export function isGameFinished(state: GameState): boolean {
  return state.status?.state === "finished";
}

function finishGameIfNeeded(state: GameState): GameState {
  const reason = getGameEndReason(state);

  if (!reason) {
    return {
      ...state,
      status: state.status?.state === "finished" ? state.status : { state: "playing" }
    };
  }

  const winner = getWinner(state.scores);
  const resultText =
    winner === "draw"
      ? "La partie est terminée sur une égalité."
      : winner === "human"
        ? "La partie est terminée. Vous gagnez."
        : "La partie est terminée. L'ordinateur gagne.";

  return {
    ...state,
    turn: {
      player: "human",
      placedTileIds: []
    },
    status: {
      state: "finished",
      winner,
      reason,
      finalScores: { ...state.scores },
      stats: getGameStats(state)
    },
    message: {
      ...state.message,
      tone: winner === "human" ? "success" : "notice",
      text: `${resultText} Score final : vous ${state.scores.human}, ordinateur ${state.scores.computer}.`
    }
  };
}

function getGameEndReason(state: GameState): GameEndReason | null {
  if (state.bag.length === 0) {
    if (state.racks.human.length === 0 || state.racks.computer.length === 0) {
      return "rack-empty";
    }

    if (!canAnyPlayerCreateWord(state)) {
      return "no-moves";
    }
  }

  if (state.passCount > 0 && !canAnyPlayerCreateWord(state)) {
    return "no-moves";
  }

  if (state.passCount >= MAX_CONSECUTIVE_PASSES) {
    return "consecutive-passes";
  }

  return null;
}

function canAnyPlayerCreateWord(state: GameState): boolean {
  return canPlayerCreateWord(state, "human") || canPlayerCreateWord(state, "computer");
}

function canPlayerCreateWord(state: GameState, player: PlayerId): boolean {
  return Boolean(
    findBestHumanMove({
      ...state,
      racks: {
        ...state.racks,
        human: state.racks[player]
      },
      turn: {
        player: "human",
        placedTileIds: []
      }
    })
  );
}

function getWinner(scores: GameState["scores"]): PlayerId | "draw" {
  if (scores.human > scores.computer) {
    return "human";
  }

  if (scores.computer > scores.human) {
    return "computer";
  }

  return "draw";
}

function getNextPlayer(player: PlayerId): PlayerId {
  return player === "human" ? "computer" : "human";
}

type ComputerMove = {
  word: string;
  words: TurnWord[];
  board: Board;
  placedTiles: PlacedTile[];
  rackAfterMove: Rack;
};

function findComputerMove(
  state: GameState,
  level: OpponentLevel,
  player: PlayerId,
  options: ComputerSearchOptions
): ComputerMove | null {
  const anchors = state.board
    .flatMap((row) => row)
    .filter((cell) => cell.tile?.committed);
  const moves: ComputerMove[] = [];
  const maxWordLength = getComputerMaxPlayableWordLength(state, level, player);
  const searchBudgetMs = getComputerSearchBudgetMs(level, options.profile);
  const maxStoredMoves = getComputerStoredMoveLimit(level, options.profile);
  const availableRackCounts = countLetters(state.racks[player].map((tile) => tile.letter));
  const availableBoardCounts = countLetters(
    anchors.map((cell) => cell.tile?.letter).filter((letter): letter is string => Boolean(letter))
  );
  const searchStartedAt = performance.now();
  let foundMoveCount = 0;

  if (anchors.length === 0) {
    return findOpeningComputerMove(state, level, player, maxWordLength, options);
  }

  for (const anchor of anchors) {
    const anchorLetter = anchor.tile?.letter;
    if (!anchorLetter) {
      continue;
    }

    for (const word of getComputerCandidateWords(anchorLetter, maxWordLength, level)) {
      if (word.length < 2) {
        continue;
      }
      if (!canBuildFromRackAndBoardCounts(word, availableRackCounts, availableBoardCounts)) {
        continue;
      }

      for (let anchorIndex = 0; anchorIndex < word.length; anchorIndex += 1) {
        if (word[anchorIndex] !== anchorLetter) {
          continue;
        }

        for (const direction of ["row", "col"] as const) {
          const move = tryBuildComputerMove(state, word, anchor.row, anchor.col, anchorIndex, direction, player);
          if (move) {
            if (level === "very-easy") {
              return move;
            }

            moves.push(move);
            foundMoveCount += 1;
            trimComputerMoves(moves, level, maxStoredMoves);

            if (foundMoveCount >= getComputerMoveSearchLimit(level, options.profile)) {
              return pickComputerMove(moves, level);
            }
          }
        }
      }

      if (moves.length > 0 && performance.now() - searchStartedAt > searchBudgetMs) {
        return pickComputerMove(moves, level);
      }
    }
  }

  return pickComputerMove(moves, level);
}

function findOpeningComputerMove(
  state: GameState,
  level: OpponentLevel,
  player: PlayerId,
  maxWordLength: number,
  options: ComputerSearchOptions
): ComputerMove | null {
  const center = Math.floor(state.board.length / 2);
  const moves: ComputerMove[] = [];
  const maxStoredMoves = getComputerStoredMoveLimit(level, options.profile);
  const searchBudgetMs = getComputerSearchBudgetMs(level, options.profile);
  const availableRackCounts = countLetters(state.racks[player].map((tile) => tile.letter));
  const searchStartedAt = performance.now();
  let foundMoveCount = 0;

  for (const word of getOpeningComputerCandidateWords(maxWordLength, level)) {
    if (!canBuildFromRackAndBoardCounts(word, availableRackCounts, new Map())) {
      continue;
    }

    for (let centerIndex = 0; centerIndex < word.length; centerIndex += 1) {
      for (const direction of ["row", "col"] as const) {
        const startRow = direction === "col" ? center - centerIndex : center;
        const startCol = direction === "row" ? center - centerIndex : center;
        const move = tryBuildComputerMoveAt(state, word, startRow, startCol, direction, player);

        if (move) {
          if (level === "very-easy") {
            return move;
          }

          moves.push(move);
          foundMoveCount += 1;
          trimComputerMoves(moves, level, maxStoredMoves);

          if (foundMoveCount >= getComputerMoveSearchLimit(level, options.profile)) {
            return pickComputerMove(moves, level);
          }
        }
      }
    }

    if (moves.length > 0 && performance.now() - searchStartedAt > searchBudgetMs) {
      return pickComputerMove(moves, level);
    }
  }

  return pickComputerMove(moves, level);
}

function getComputerMaxPlayableWordLength(state: GameState, level: OpponentLevel, player: PlayerId): number {
  const maxAlignedCommittedTiles = getMaxCommittedTilesInSingleLine(state.board);

  return Math.min(getComputerMaxWordLength(level), state.board.length, state.racks[player].length + maxAlignedCommittedTiles);
}

function getMaxCommittedTilesInSingleLine(board: Board): number {
  let maxCount = 0;

  for (const row of board) {
    maxCount = Math.max(maxCount, row.filter((cell) => cell.tile?.committed).length);
  }

  for (let col = 0; col < board.length; col += 1) {
    let colCount = 0;

    for (let row = 0; row < board.length; row += 1) {
      if (board[row][col].tile?.committed) {
        colCount += 1;
      }
    }

    maxCount = Math.max(maxCount, colCount);
  }

  return maxCount;
}

function countLetters(letters: string[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const letter of letters) {
    counts.set(letter, (counts.get(letter) ?? 0) + 1);
  }

  return counts;
}

function canBuildFromRackAndBoardCounts(
  word: string,
  availableRackCounts: Map<string, number>,
  availableBoardCounts: Map<string, number>
): boolean {
  const rackCounts = new Map(availableRackCounts);
  const boardCounts = new Map(availableBoardCounts);

  for (const letter of word) {
    const rackRemaining = rackCounts.get(letter) ?? 0;
    if (rackRemaining > 0) {
      rackCounts.set(letter, rackRemaining - 1);
      continue;
    }

    const boardRemaining = boardCounts.get(letter) ?? 0;
    if (boardRemaining <= 0) {
      return false;
    }
    boardCounts.set(letter, boardRemaining - 1);
  }

  return true;
}

function* getComputerCandidateWords(anchorLetter: string, maxWordLength: number, level: OpponentLevel): Iterable<string> {
  if (level === "very-easy" || level === "easy") {
    yield* getDictionaryWordsContainingLetter(anchorLetter, maxWordLength);
    return;
  }

  for (let length = maxWordLength; length >= 2; length -= 1) {
    yield* getDictionaryWordsContainingLetterByLength(anchorLetter, length);
  }
}

function* getOpeningComputerCandidateWords(maxWordLength: number, level: OpponentLevel): Iterable<string> {
  if (level === "very-easy" || level === "easy") {
    yield* getDictionaryWordsByLength(2, maxWordLength);
    return;
  }

  for (let length = maxWordLength; length >= 2; length -= 1) {
    yield* getDictionaryWordsByLength(length, length);
  }
}

function getComputerMaxWordLength(level: OpponentLevel): number {
  switch (level) {
    case "very-easy":
      return 4;
    case "easy":
      return 7;
    case "normal":
      return 10;
    case "hard":
      return 13;
    case "expert":
      return 17;
  }
}

export function getComputerMoveSearchLimit(level: OpponentLevel, profile: ComputerSearchProfile = "balanced"): number {
  const baseLimit = (() => {
    switch (level) {
    case "very-easy":
      return 1;
    case "easy":
      return 35;
    case "normal":
      return 160;
    case "hard":
      return 600;
    case "expert":
      return 1_500;
    }
  })();

  return Math.max(1, Math.round(baseLimit * getComputerSearchProfileConfig(profile).candidateMultiplier));
}

function getComputerStoredMoveLimit(level: OpponentLevel, profile: ComputerSearchProfile = "balanced"): number {
  const baseLimit = (() => {
    switch (level) {
    case "very-easy":
      return 1;
    case "easy":
      return 24;
    case "normal":
      return 36;
    case "hard":
      return 48;
    case "expert":
      return 64;
    }
  })();

  return Math.max(1, Math.round(baseLimit * getComputerSearchProfileConfig(profile).storageMultiplier));
}

export function getComputerSearchBudgetMs(level: OpponentLevel, profile: ComputerSearchProfile = "balanced"): number {
  const baseBudget = (() => {
    switch (level) {
    case "very-easy":
      return 25;
    case "easy":
      return 90;
    case "normal":
      return 220;
    case "hard":
      return 550;
    case "expert":
      return 1_200;
    }
  })();
  const config = getComputerSearchProfileConfig(profile);

  return Math.min(config.maxBudgetMs, Math.round(baseBudget * config.timeMultiplier));
}

function getComputerSearchProfileConfig(profile: ComputerSearchProfile): {
  timeMultiplier: number;
  candidateMultiplier: number;
  storageMultiplier: number;
  maxBudgetMs: number;
} {
  if (profile === "safe") {
    return {
      timeMultiplier: 0.55,
      candidateMultiplier: 0.55,
      storageMultiplier: 0.7,
      maxBudgetMs: 650
    };
  }

  if (profile === "quality") {
    return {
      timeMultiplier: 1.35,
      candidateMultiplier: 1.25,
      storageMultiplier: 1.2,
      maxBudgetMs: 1_800
    };
  }

  return {
    timeMultiplier: 1,
    candidateMultiplier: 1,
    storageMultiplier: 1,
    maxBudgetMs: 1_200
  };
}

function pickComputerMove(moves: ComputerMove[], level: OpponentLevel): ComputerMove | null {
  if (moves.length === 0) {
    return null;
  }

  if (level === "easy") {
    const rankedMoves = rankComputerMoves(moves);
    return rankedMoves[Math.floor(rankedMoves.length * 0.75)] ?? rankedMoves[rankedMoves.length - 1] ?? rankedMoves[0];
  }

  if (level === "normal") {
    const rankedMoves = rankComputerMoves(moves);
    return rankedMoves[Math.floor(rankedMoves.length / 2)] ?? rankedMoves[0];
  }

  return rankComputerMoves(moves)[0];
}

function trimComputerMoves(moves: ComputerMove[], level: OpponentLevel, maxStoredMoves: number): void {
  if (moves.length <= maxStoredMoves) {
    return;
  }

  const rankedMoves = rankComputerMoves(moves);
  const retainedMoves =
    level === "easy" || level === "normal"
      ? rankedMoves.slice(0, maxStoredMoves * 2).filter((_, index) => index % 2 === 0).slice(0, maxStoredMoves)
      : rankedMoves.slice(0, maxStoredMoves);

  moves.splice(0, moves.length, ...retainedMoves);
}

function rankComputerMoves(moves: ComputerMove[]): ComputerMove[] {
  return [...moves].sort((first, second) => {
    const firstScore = explainTurnScore(first.board, first.words, first.placedTiles).total;
    const secondScore = explainTurnScore(second.board, second.words, second.placedTiles).total;

    return secondScore - firstScore || first.word.length - second.word.length || first.word.localeCompare(second.word);
  });
}

function tryBuildComputerMove(
  state: GameState,
  word: string,
  anchorRow: number,
  anchorCol: number,
  anchorIndex: number,
  direction: "row" | "col",
  player: PlayerId
): ComputerMove | null {
  const startRow = direction === "col" ? anchorRow - anchorIndex : anchorRow;
  const startCol = direction === "row" ? anchorCol - anchorIndex : anchorCol;

  return tryBuildComputerMoveAt(state, word, startRow, startCol, direction, player);
}

function tryBuildComputerMoveAt(
  state: GameState,
  word: string,
  startRow: number,
  startCol: number,
  direction: "row" | "col",
  player: PlayerId
): ComputerMove | null {
  const rackAfterMove = [...state.racks[player]];
  const pendingPlacements: { tile: Tile; row: number; col: number }[] = [];

  for (let index = 0; index < word.length; index += 1) {
    const row = direction === "col" ? startRow + index : startRow;
    const col = direction === "row" ? startCol + index : startCol;

    if (!isInsideBoard(row, col, state.board.length)) {
      return null;
    }

    const cell = state.board[row][col];
    if (cell.tile) {
      if (cell.tile.letter !== word[index]) {
        return null;
      }
      continue;
    }

    const rackIndex = rackAfterMove.findIndex((tile) => tile.letter === word[index]);
    if (rackIndex === -1) {
      return null;
    }

    const [tile] = rackAfterMove.splice(rackIndex, 1);
    pendingPlacements.push({ tile, row, col });
  }

  if (pendingPlacements.length === 0) {
    return null;
  }

  const board = cloneBoard(state.board);
  const placedTiles: PlacedTile[] = [];

  for (const placement of pendingPlacements) {
    const placedTile: PlacedTile = {
      ...placement.tile,
      row: placement.row,
      col: placement.col,
      owner: player,
      committed: false
    };
    board[placement.row][placement.col].tile = placedTile;
    placedTiles.push(placedTile);
  }

  const validation = validateTurn(board);
  if (!validation.ok || validation.word !== word) {
    return null;
  }

  return {
    word,
    words: validation.words,
    board,
    placedTiles,
    rackAfterMove
  };
}

function commitPlacedTiles(board: GameState["board"], owner: PlayerId): GameState["board"] {
  return board.map((row) =>
    row.map((cell) => {
      if (cell.tile && !cell.tile.committed && cell.tile.owner === owner) {
        return {
          ...cell,
          tile: {
            ...cell.tile,
            committed: true
          }
        };
      }

      return {
        ...cell,
        tile: cell.tile ? { ...cell.tile } : null
      };
    })
  );
}

function stripPlacement(tile: PlacedTile): Tile {
  return {
    id: tile.id,
    letter: tile.letter,
    value: tile.value
  };
}

function parseBoardTileToken(token: string): { row: number; col: number } | null {
  if (!token.startsWith(BOARD_TILE_TOKEN_PREFIX)) {
    return null;
  }

  const [row, col] = token.slice(BOARD_TILE_TOKEN_PREFIX.length).split(":").map(Number);

  if (!Number.isInteger(row) || !Number.isInteger(col)) {
    return null;
  }

  return { row, col };
}
