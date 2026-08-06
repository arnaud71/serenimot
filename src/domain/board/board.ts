import { BOARD_SIZE, Board, BoardSize, BonusKind, CENTER, getBoardCenter } from "../tiles/types";

const WORD_BONUS_COORDS = new Set([
  "2:6",
  "6:2",
  "6:10",
  "10:6"
]);

const WORD_TRIPLE_BONUS_COORDS = new Set([
  "0:0",
  "0:12",
  "12:0",
  "12:12"
]);

const LETTER_BONUS_COORDS = new Set([
  "1:4",
  "1:8",
  "4:1",
  "4:11",
  "8:1",
  "8:11",
  "11:4",
  "11:8"
]);

const LETTER_TRIPLE_BONUS_COORDS = new Set(["1:1", "1:11", "11:1", "11:11"]);

const CALM_BONUS_COORDS = new Set(["2:2", "2:10", "10:2", "10:10", `${CENTER}:${CENTER}`]);

export function getBonus(row: number, col: number, boardSize: BoardSize = BOARD_SIZE): BonusKind {
  if (boardSize !== BOARD_SIZE) {
    return getScaledBonus(row, col, boardSize);
  }

  const key = `${row}:${col}`;

  if (CALM_BONUS_COORDS.has(key)) {
    return "calm";
  }

  if (WORD_BONUS_COORDS.has(key)) {
    return "word";
  }

  if (WORD_TRIPLE_BONUS_COORDS.has(key)) {
    return "word3";
  }

  if (LETTER_BONUS_COORDS.has(key)) {
    return "letter";
  }

  if (LETTER_TRIPLE_BONUS_COORDS.has(key)) {
    return "letter3";
  }

  return "plain";
}

function getScaledBonus(row: number, col: number, boardSize: BoardSize): BonusKind {
  const bonusMap = createScaledBonusMap(boardSize);
  return bonusMap.get(`${row}:${col}`) ?? "plain";
}

function createScaledBonusMap(boardSize: BoardSize): Map<string, BonusKind> {
  const bonusMap = new Map<string, BonusKind>();
  const center = getBoardCenter(boardSize);

  addSymmetricBonus(bonusMap, boardSize, 0, 0, "word3");
  addBonus(bonusMap, center, center, "calm");

  if (boardSize >= 11) {
    addSymmetricBonus(bonusMap, boardSize, 1, 1, "letter3");
  }

  if (boardSize >= 15) {
    addSymmetricBonus(bonusMap, boardSize, 1, center, "letter3");
  }

  const wordDistance = Math.max(2, Math.floor(boardSize / 3));
  addSymmetricBonus(bonusMap, boardSize, center, center - wordDistance, "word");

  if (boardSize >= 15) {
    addSymmetricBonus(bonusMap, boardSize, center - 2, center - wordDistance, "word");
  }

  const letterDistance = Math.max(3, wordDistance);
  addSymmetricBonus(bonusMap, boardSize, center - letterDistance, center - letterDistance, "letter");

  if (boardSize >= 13) {
    addSymmetricBonus(bonusMap, boardSize, center - 1, center - letterDistance, "letter");
  }

  if (boardSize >= 17) {
    addSymmetricBonus(bonusMap, boardSize, center - 2, center - letterDistance, "letter");
  }

  if (boardSize >= 13) {
    const calmDistance = Math.max(2, wordDistance - 1);
    addSymmetricBonus(bonusMap, boardSize, center - calmDistance, center - calmDistance, "calm");
  }

  return bonusMap;
}

function addSymmetricBonus(
  bonusMap: Map<string, BonusKind>,
  boardSize: BoardSize,
  row: number,
  col: number,
  bonus: BonusKind
): void {
  const edge = boardSize - 1;
  const coordinates = [
    [row, col],
    [row, edge - col],
    [edge - row, col],
    [edge - row, edge - col],
    [col, row],
    [col, edge - row],
    [edge - col, row],
    [edge - col, edge - row]
  ];

  for (const [candidateRow, candidateCol] of coordinates) {
    addBonus(bonusMap, candidateRow, candidateCol, bonus);
  }
}

function addBonus(bonusMap: Map<string, BonusKind>, row: number, col: number, bonus: BonusKind): void {
  const key = `${row}:${col}`;

  if (!bonusMap.has(key)) {
    bonusMap.set(key, bonus);
  }
}

export function createBoard(boardSize: BoardSize = BOARD_SIZE): Board {
  return Array.from({ length: boardSize }, (_, row) =>
    Array.from({ length: boardSize }, (_, col) => ({
      row,
      col,
      bonus: getBonus(row, col, boardSize),
      tile: null
    }))
  );
}

export function cloneBoard(board: Board): Board {
  return board.map((row) =>
    row.map((cell) => ({
      ...cell,
      tile: cell.tile ? { ...cell.tile } : null
    }))
  );
}

export function hasCommittedTile(board: Board): boolean {
  return board.some((row) => row.some((cell) => cell.tile?.committed));
}

export function isInsideBoard(row: number, col: number, boardSize: number = BOARD_SIZE): boolean {
  return row >= 0 && row < boardSize && col >= 0 && col < boardSize;
}
