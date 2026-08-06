import { hasCommittedTile } from "../board/board";
import { Board, BoardCell, PlacedTile, getBoardCenter } from "../tiles/types";
import { isWordAccepted } from "./dictionary";

export type ValidationResult =
  | { ok: true; word: string; words: TurnWord[] }
  | { ok: false; reason: string };

type Direction = "row" | "col";

export type TurnWord = {
  word: string;
  direction: Direction;
  cells: BoardCell[];
};

export function getPlacedTiles(board: Board): PlacedTile[] {
  return board
    .flatMap((row) => row.map((cell) => cell.tile))
    .filter((tile): tile is PlacedTile => Boolean(tile && !tile.committed));
}

export function validateTurn(board: Board): ValidationResult {
  const placedTiles = getPlacedTiles(board);

  if (placedTiles.length === 0) {
    return { ok: false, reason: "Placez au moins une lettre avant de valider." };
  }

  const sameRow = placedTiles.every((tile) => tile.row === placedTiles[0].row);
  const sameCol = placedTiles.every((tile) => tile.col === placedTiles[0].col);

  if (!sameRow && !sameCol) {
    return { ok: false, reason: "Les lettres du tour doivent rester sur une même ligne ou colonne." };
  }

  const center = getBoardCenter(board);
  if (!hasCommittedTile(board) && !placedTiles.some((tile) => tile.row === center && tile.col === center)) {
    return { ok: false, reason: "Le premier mot doit passer par la case centrale." };
  }

  if (hasCommittedTile(board) && !isConnectedToCommittedTile(board, placedTiles)) {
    return { ok: false, reason: "Le mot doit se connecter aux lettres déjà posées." };
  }

  const direction = getMainDirection(board, placedTiles, sameRow, sameCol);
  const continuity = validateContinuity(board, placedTiles, direction);

  if (!continuity.ok) {
    return continuity;
  }

  const mainWord = readWord(board, placedTiles[0].row, placedTiles[0].col, direction);

  if (mainWord.word.length < 2) {
    return { ok: false, reason: "Le mot doit contenir au moins deux lettres." };
  }

  const secondaryWords = collectSecondaryWords(board, placedTiles, direction);
  const words = [mainWord, ...secondaryWords];

  for (const word of words) {
    if (!isWordAccepted(word.word)) {
      return {
        ok: false,
        reason: `Le mot "${word.word}" n'est pas reconnu dans le dictionnaire actuel.`
      };
    }
  }

  return { ok: true, word: mainWord.word, words };
}

function getMainDirection(board: Board, placedTiles: PlacedTile[], sameRow: boolean, sameCol: boolean): Direction {
  if (sameRow && sameCol) {
    const tile = placedTiles[0];
    const rowWord = readWord(board, tile.row, tile.col, "row");
    const colWord = readWord(board, tile.row, tile.col, "col");

    if (colWord.word.length > rowWord.word.length) {
      return "col";
    }
  }

  return sameRow ? "row" : "col";
}

function isConnectedToCommittedTile(board: Board, placedTiles: PlacedTile[]): boolean {
  return placedTiles.some((tile) => {
    const neighbors = [
      board[tile.row - 1]?.[tile.col],
      board[tile.row + 1]?.[tile.col],
      board[tile.row]?.[tile.col - 1],
      board[tile.row]?.[tile.col + 1]
    ];

    return neighbors.some((cell) => cell?.tile?.committed);
  });
}

function validateContinuity(
  board: Board,
  placedTiles: PlacedTile[],
  direction: Direction
): { ok: true } | { ok: false; reason: string } {
  const fixedAxis = direction === "row" ? placedTiles[0].row : placedTiles[0].col;
  const positions = placedTiles.map((tile) => (direction === "row" ? tile.col : tile.row));
  const min = Math.min(...positions);
  const max = Math.max(...positions);

  for (let position = min; position <= max; position += 1) {
    const row = direction === "row" ? fixedAxis : position;
    const col = direction === "row" ? position : fixedAxis;

    if (!board[row]?.[col]?.tile) {
      return {
        ok: false,
        reason: "Le mot doit être continu, sans case vide entre les lettres."
      };
    }
  }

  return { ok: true };
}

function collectSecondaryWords(board: Board, placedTiles: PlacedTile[], mainDirection: Direction): TurnWord[] {
  const secondaryDirection = mainDirection === "row" ? "col" : "row";

  return placedTiles
    .map((tile) => readWord(board, tile.row, tile.col, secondaryDirection))
    .filter((word) => word.cells.length > 1);
}

function readWord(board: Board, anchorRow: number, anchorCol: number, direction: Direction): TurnWord {
  let row = anchorRow;
  let col = anchorCol;

  while (direction === "row" ? board[row]?.[col - 1]?.tile : board[row - 1]?.[col]?.tile) {
    if (direction === "row") {
      col -= 1;
    } else {
      row -= 1;
    }
  }

  let word = "";
  const cells: BoardCell[] = [];
  while (board[row]?.[col]?.tile) {
    word += board[row][col].tile?.letter ?? "";
    cells.push(board[row][col]);
    if (direction === "row") {
      col += 1;
    } else {
      row += 1;
    }
  }

  return { word, direction, cells };
}
