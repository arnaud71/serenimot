export type PlayerId = "human" | "computer";

export type Tile = {
  id: string;
  letter: string;
  value: number;
};

export type Rack = Tile[];

export type PlacedTile = Tile & {
  row: number;
  col: number;
  owner: PlayerId;
  committed: boolean;
};

export type BonusKind = "plain" | "letter" | "letter3" | "word" | "word3" | "calm";

export type ScoreLetterDetail = {
  letter: string;
  value: number;
  row: number;
  col: number;
  isNew: boolean;
  bonus: BonusKind;
  points: number;
  note: string;
};

export type ScoreWordDetail = {
  word: string;
  subtotal: number;
  wordMultiplier: number;
  letters: ScoreLetterDetail[];
};

export type ScoreDetails = {
  words: ScoreWordDetail[];
  fullRackBonus: number;
  total: number;
};

export type BoardCell = {
  row: number;
  col: number;
  bonus: BonusKind;
  tile: PlacedTile | null;
};

export type Board = BoardCell[][];

export type Turn = {
  player: PlayerId;
  placedTileIds: string[];
};

export type GameMessage = {
  tone: "info" | "success" | "notice";
  text: string;
  scoreDetails?: ScoreDetails;
};

export type GameEndReason = "rack-empty" | "no-moves" | "consecutive-passes";

export type GameStatus =
  | { state: "playing" }
  | {
      state: "finished";
      winner: PlayerId | "draw";
      reason: GameEndReason;
      finalScores: Record<PlayerId, number>;
      stats?: GameStats;
    };

export type GameStats = {
  humanTurns: number;
  computerTurns: number;
  passes: number;
  exchanges: number;
  hints: {
    partial: number;
    complete: number;
  };
};

export type GameState = {
  gameId: string;
  board: Board;
  bag: Tile[];
  racks: Record<PlayerId, Rack>;
  scores: Record<PlayerId, number>;
  turn: Turn;
  passCount: number;
  stats?: GameStats;
  message: GameMessage;
  status?: GameStatus;
};

export type PlacementResult =
  | { ok: true; state: GameState }
  | { ok: false; reason: string; state: GameState };

export const BOARD_SIZE = 13;
export const RACK_SIZE = 8;
export const CENTER = Math.floor(BOARD_SIZE / 2);

export type BoardSize = 9 | 11 | 13 | 15 | 17;

export function getBoardCenter(boardOrSize: Board | number = BOARD_SIZE): number {
  const size = typeof boardOrSize === "number" ? boardOrSize : boardOrSize.length;

  return Math.floor(size / 2);
}
