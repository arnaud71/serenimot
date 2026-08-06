import { cloneBoard, hasCommittedTile, isInsideBoard } from "../board/board";
import {
  getDictionaryWordsByLength,
  getDictionaryWordsContainingLetterByLength
} from "../rules/dictionary";
import { validateTurn } from "../rules/validation";
import { explainTurnScore } from "../scoring/scoring";
import { Board, GameState, PlacedTile, Rack, Tile, getBoardCenter } from "../tiles/types";
import type { PlacementDirection } from "./game";
import type { TurnWord } from "../rules/validation";
import type { ScoreDetails } from "../tiles/types";

const BOARD_TILE_TOKEN_PREFIX = "board:";

export type BestMoveHint = {
  word: string;
  row: number;
  col: number;
  direction: PlacementDirection;
  score: number;
  scoreDetails: ScoreDetails;
  words: TurnWord[];
  tileIds: string[];
  board: Board;
  placedTiles: PlacedTile[];
  rackAfterMove: Rack;
};

export function findBestHumanMove(state: GameState): BestMoveHint | null {
  const searchContext = createHumanMoveSearchContext(state);
  let bestMove: BestMoveHint | null = null;

  for (const word of getHumanCandidateWords(searchContext)) {
    if (!canPossiblyBuildWord(searchContext, word)) {
      continue;
    }

    for (const move of findMovesForWord(state, word, searchContext)) {
      if (!bestMove || compareHumanMoves(move, bestMove) < 0) {
        bestMove = move;
      }
    }
  }

  return bestMove;
}

type HumanMoveSearchContext = {
  hasCommittedTiles: boolean;
  availableRackCounts: Map<string, number>;
  availableBoardCounts: Map<string, number>;
  committedLetters: string[];
  anchors: Board[number][number][];
  maxWordLength: number;
};

function createHumanMoveSearchContext(state: GameState): HumanMoveSearchContext {
  const committedLetters = state.board
    .flatMap((row) => row)
    .map((cell) => cell.tile)
    .filter((tile): tile is PlacedTile => Boolean(tile?.committed))
    .map((tile) => tile.letter);

  const hasCommittedTiles = committedLetters.length > 0;

  return {
    hasCommittedTiles,
    availableRackCounts: countLetters(state.racks.human.map((tile) => tile.letter)),
    availableBoardCounts: countLetters(committedLetters),
    committedLetters: [...new Set(committedLetters)],
    anchors: state.board.flatMap((row) => row).filter((cell) => cell.tile?.committed),
    maxWordLength: hasCommittedTiles
      ? Math.min(state.board.length, state.racks.human.length + getMaxCommittedTilesInSingleLine(state.board))
      : state.racks.human.length
  };
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

function* getHumanCandidateWords(searchContext: HumanMoveSearchContext): Iterable<string> {
  if (!searchContext.hasCommittedTiles) {
    yield* getDictionaryWordsByLength(2, searchContext.maxWordLength);
    return;
  }

  const yieldedWords = new Set<string>();

  for (let length = searchContext.maxWordLength; length >= 2; length -= 1) {
    for (const letter of searchContext.committedLetters) {
      for (const word of getDictionaryWordsContainingLetterByLength(letter, length)) {
        if (yieldedWords.has(word)) {
          continue;
        }
        yieldedWords.add(word);
        yield word;
      }
    }
  }
}

function canPossiblyBuildWord(searchContext: HumanMoveSearchContext, word: string): boolean {
  if (!searchContext.hasCommittedTiles) {
    return canBuildFromCounts(word, searchContext.availableRackCounts);
  }

  if (!searchContext.committedLetters.some((letter) => word.includes(letter))) {
    return false;
  }

  return canBuildFromRackAndBoardCounts(word, searchContext.availableRackCounts, searchContext.availableBoardCounts);
}

function compareHumanMoves(first: BestMoveHint, second: BestMoveHint): number {
  return second.score - first.score || second.word.length - first.word.length || first.word.localeCompare(second.word);
}

function countLetters(letters: string[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const letter of letters) {
    counts.set(letter, (counts.get(letter) ?? 0) + 1);
  }

  return counts;
}

function canBuildFromCounts(word: string, availableCounts: Map<string, number>): boolean {
  const remainingCounts = new Map(availableCounts);

  for (const letter of word) {
    const remaining = remainingCounts.get(letter) ?? 0;
    if (remaining <= 0) {
      return false;
    }
    remainingCounts.set(letter, remaining - 1);
  }

  return true;
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

function* findMovesForWord(state: GameState, word: string, searchContext: HumanMoveSearchContext): Iterable<BestMoveHint> {
  if (hasCommittedTile(state.board)) {
    yield* findAnchoredMoves(state, word, searchContext.anchors);
    return;
  }

  yield* findOpeningMoves(state, word);
}

function* findOpeningMoves(state: GameState, word: string): Iterable<BestMoveHint> {
  const center = getBoardCenter(state.board);

  for (const direction of ["row", "col"] as const) {
    for (let index = 0; index < word.length; index += 1) {
      const row = direction === "col" ? center - index : center;
      const col = direction === "row" ? center - index : center;
      const move = tryBuildHintMove(state, word, row, col, direction);

      if (move) {
        yield move;
      }
    }
  }
}

function* findAnchoredMoves(state: GameState, word: string, anchors: Board[number][number][]): Iterable<BestMoveHint> {
  for (const anchor of anchors) {
    const anchorLetter = anchor.tile?.letter;
    if (!anchorLetter) {
      continue;
    }

    for (let anchorIndex = 0; anchorIndex < word.length; anchorIndex += 1) {
      if (word[anchorIndex] !== anchorLetter) {
        continue;
      }

      for (const direction of ["row", "col"] as const) {
        const row = direction === "col" ? anchor.row - anchorIndex : anchor.row;
        const col = direction === "row" ? anchor.col - anchorIndex : anchor.col;
        const move = tryBuildHintMove(state, word, row, col, direction);

        if (move) {
          yield move;
        }
      }
    }
  }
}

function tryBuildHintMove(
  state: GameState,
  word: string,
  row: number,
  col: number,
  direction: PlacementDirection
): BestMoveHint | null {
  const rackAfterMove = [...state.racks.human];
  const tileIds: string[] = [];
  const pendingPlacements: { tile: Tile; row: number; col: number }[] = [];

  for (let index = 0; index < word.length; index += 1) {
    const targetRow = direction === "col" ? row + index : row;
    const targetCol = direction === "row" ? col + index : col;

    if (!isInsideBoard(targetRow, targetCol, state.board.length)) {
      return null;
    }

    const cell = state.board[targetRow][targetCol];
    if (cell.tile) {
      if (cell.tile.letter !== word[index]) {
        return null;
      }
      tileIds.push(`${BOARD_TILE_TOKEN_PREFIX}${targetRow}:${targetCol}`);
      continue;
    }

    const rackIndex = rackAfterMove.findIndex((tile) => tile.letter === word[index]);
    if (rackIndex === -1) {
      return null;
    }

    const [tile] = rackAfterMove.splice(rackIndex, 1);
    tileIds.push(tile.id);
    pendingPlacements.push({ tile, row: targetRow, col: targetCol });
  }

  if (
    pendingPlacements.length === 0 ||
    touchesBeforeStart(state.board, row, col, direction) ||
    touchesAfterEnd(state.board, word, row, col, direction)
  ) {
    return null;
  }

  const board = cloneBoard(state.board);
  const placedTiles: PlacedTile[] = [];

  for (const placement of pendingPlacements) {
    const placedTile: PlacedTile = {
      ...placement.tile,
      row: placement.row,
      col: placement.col,
      owner: "human",
      committed: false
    };
    board[placement.row][placement.col].tile = placedTile;
    placedTiles.push(placedTile);
  }

  const validation = validateTurn(board);
  if (!validation.ok || validation.word !== word) {
    return null;
  }

  const scoreDetails = explainTurnScore(board, validation.words, placedTiles);

  return {
    word,
    row,
    col,
    direction,
    score: scoreDetails.total,
    scoreDetails,
    words: validation.words,
    tileIds,
    board,
    placedTiles,
    rackAfterMove
  };
}

function touchesBeforeStart(board: Board, row: number, col: number, direction: PlacementDirection): boolean {
  const beforeRow = direction === "col" ? row - 1 : row;
  const beforeCol = direction === "row" ? col - 1 : col;

  return isBoardPositionOccupied(board, beforeRow, beforeCol);
}

function touchesAfterEnd(
  board: Board,
  word: string,
  row: number,
  col: number,
  direction: PlacementDirection
): boolean {
  const afterRow = direction === "col" ? row + word.length : row;
  const afterCol = direction === "row" ? col + word.length : col;

  return isBoardPositionOccupied(board, afterRow, afterCol);
}

function isBoardPositionOccupied(board: Board, row: number, col: number): boolean {
  if (row < 0 || row >= board.length || col < 0 || col >= board.length) {
    return false;
  }

  return Boolean(board[row][col].tile);
}
