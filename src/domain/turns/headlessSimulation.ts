import { BoardSize, GameEndReason, GameState, PlayerId } from "../tiles/types";
import {
  ComputerSearchProfile,
  OpponentLevel,
  createNewGame,
  isGameFinished,
  playAutomatedTurn
} from "./game";

export type HeadlessSimulationOptions = {
  humanLevel?: OpponentLevel;
  computerLevel?: OpponentLevel;
  boardSize?: BoardSize;
  maxTurns?: number;
  random?: () => number;
  searchProfile?: ComputerSearchProfile;
};

export type HeadlessSimulationTurn = {
  turn: number;
  player: PlayerId;
  scoreBefore: number;
  scoreAfter: number;
  scoreDelta: number;
  words: string[];
  mainWord: string | null;
  message: string;
};

export type HeadlessSimulationResult = {
  state: GameState;
  turnsPlayed: number;
  finished: boolean;
  winner: PlayerId | "draw" | null;
  reason: GameEndReason | null;
  history: HeadlessSimulationTurn[];
  durationMs: number;
};

export type HeadlessSimulationReportOptions = Omit<HeadlessSimulationOptions, "random"> & {
  games?: number;
  seed?: number;
};

export type HeadlessSimulationGameSummary = {
  game: number;
  finished: boolean;
  winner: PlayerId | "draw" | null;
  reason: GameEndReason | null;
  turns: number;
  durationMs: number;
  scores: Record<PlayerId, number>;
  wordsPlayed: number;
  averageWordLength: number;
};

export type HeadlessSimulationReport = {
  games: number;
  finished: number;
  unfinished: number;
  durationMs: number;
  averageDurationMs: number;
  averageTurns: number;
  wins: Record<PlayerId | "draw" | "unfinished", number>;
  reasons: Record<GameEndReason | "unfinished", number>;
  averageScores: Record<PlayerId, number>;
  totalWordsPlayed: number;
  averageWordsPerGame: number;
  averageWordLength: number;
  wordsByLength: Record<number, number>;
  mostPlayedWords: { word: string; count: number }[];
  gameSummaries: HeadlessSimulationGameSummary[];
};

const DEFAULT_MAX_TURNS = 240;

export function runHeadlessComputerGame(options: HeadlessSimulationOptions = {}): HeadlessSimulationResult {
  const startedAt = performance.now();
  let state = createNewGame({
    boardSize: options.boardSize,
    random: options.random
  });
  const maxTurns = options.maxTurns ?? DEFAULT_MAX_TURNS;
  const history: HeadlessSimulationTurn[] = [];

  for (let turn = 1; turn <= maxTurns && !isGameFinished(state); turn += 1) {
    const player = state.turn.player;
    const scoreBefore = state.scores[player];
    const level = player === "human" ? (options.humanLevel ?? "normal") : (options.computerLevel ?? "normal");
    state = playAutomatedTurn(state, player, level, { profile: options.searchProfile });
    const scoreAfter = state.scores[player];
    const words = scoreAfter > scoreBefore ? (state.message.scoreDetails?.words.map((word) => word.word) ?? []) : [];

    history.push({
      turn,
      player,
      scoreBefore,
      scoreAfter,
      scoreDelta: scoreAfter - scoreBefore,
      words,
      mainWord: words[0] ?? null,
      message: state.message.text
    });
  }

  const finalStatus = state.status?.state === "finished" ? state.status : null;

  return {
    state,
    turnsPlayed: history.length,
    finished: Boolean(finalStatus),
    winner: finalStatus?.winner ?? null,
    reason: finalStatus?.reason ?? null,
    history,
    durationMs: performance.now() - startedAt
  };
}

export function runHeadlessSimulationReport(options: HeadlessSimulationReportOptions = {}): HeadlessSimulationReport {
  const startedAt = performance.now();
  const games = options.games ?? 20;
  const seed = options.seed ?? 1;
  const wins: HeadlessSimulationReport["wins"] = {
    human: 0,
    computer: 0,
    draw: 0,
    unfinished: 0
  };
  const reasons: HeadlessSimulationReport["reasons"] = {
    "rack-empty": 0,
    "no-moves": 0,
    "consecutive-passes": 0,
    unfinished: 0
  };
  const scoreTotals: Record<PlayerId, number> = {
    human: 0,
    computer: 0
  };
  const wordCounts = new Map<string, number>();
  const wordsByLength = new Map<number, number>();
  const gameSummaries: HeadlessSimulationGameSummary[] = [];
  let finished = 0;
  let totalTurns = 0;
  let totalWordsPlayed = 0;
  let totalWordLetters = 0;

  for (let index = 0; index < games; index += 1) {
    const result = runHeadlessComputerGame({
      ...options,
      random: createSeededRandom(seed + index)
    });
    const words = result.history.flatMap((turn) => turn.words);
    const wordLetters = words.reduce((sum, word) => sum + word.length, 0);

    totalTurns += result.turnsPlayed;
    totalWordsPlayed += words.length;
    totalWordLetters += wordLetters;
    scoreTotals.human += result.state.scores.human;
    scoreTotals.computer += result.state.scores.computer;

    if (result.finished) {
      finished += 1;
      wins[result.winner ?? "draw"] += 1;
      reasons[result.reason ?? "consecutive-passes"] += 1;
    } else {
      wins.unfinished += 1;
      reasons.unfinished += 1;
    }

    for (const word of words) {
      wordCounts.set(word, (wordCounts.get(word) ?? 0) + 1);
      wordsByLength.set(word.length, (wordsByLength.get(word.length) ?? 0) + 1);
    }

    gameSummaries.push({
      game: index + 1,
      finished: result.finished,
      winner: result.winner,
      reason: result.reason,
      turns: result.turnsPlayed,
      durationMs: result.durationMs,
      scores: { ...result.state.scores },
      wordsPlayed: words.length,
      averageWordLength: words.length > 0 ? wordLetters / words.length : 0
    });
  }

  const durationMs = performance.now() - startedAt;

  return {
    games,
    finished,
    unfinished: games - finished,
    durationMs,
    averageDurationMs: durationMs / games,
    averageTurns: totalTurns / games,
    wins,
    reasons,
    averageScores: {
      human: scoreTotals.human / games,
      computer: scoreTotals.computer / games
    },
    totalWordsPlayed,
    averageWordsPerGame: totalWordsPlayed / games,
    averageWordLength: totalWordsPlayed > 0 ? totalWordLetters / totalWordsPlayed : 0,
    wordsByLength: Object.fromEntries([...wordsByLength.entries()].sort((first, second) => first[0] - second[0])),
    mostPlayedWords: [...wordCounts.entries()]
      .sort((first, second) => second[1] - first[1] || first[0].localeCompare(second[0]))
      .slice(0, 12)
      .map(([word, count]) => ({ word, count })),
    gameSummaries
  };
}

export function formatHeadlessSimulationReport(report: HeadlessSimulationReport): string {
  const scoreLine = `Scores moyens : joueur automatique ${formatNumber(report.averageScores.human)}, ordinateur ${formatNumber(report.averageScores.computer)}`;
  const winLine = `Victoires : joueur automatique ${report.wins.human}, ordinateur ${report.wins.computer}, égalités ${report.wins.draw}, inachevées ${report.wins.unfinished}`;
  const wordLengthLine = Object.entries(report.wordsByLength)
    .map(([length, count]) => `${length} lettres: ${count}`)
    .join(", ");
  const commonWordsLine = report.mostPlayedWords.map((entry) => `${entry.word} (${entry.count})`).join(", ");

  return [
    "Rapport de simulation Sérénimot",
    `Parties : ${report.games} (${report.finished} terminées, ${report.unfinished} inachevées)`,
    `Durée moyenne : ${formatNumber(report.averageDurationMs)} ms`,
    `Tours moyens : ${formatNumber(report.averageTurns)}`,
    scoreLine,
    winLine,
    `Mots joués : ${report.totalWordsPlayed}, moyenne ${formatNumber(report.averageWordsPerGame)} par partie`,
    `Longueur moyenne des mots : ${formatNumber(report.averageWordLength)}`,
    `Répartition des longueurs : ${wordLengthLine || "aucun mot joué"}`,
    `Mots les plus joués : ${commonWordsLine || "aucun"}`
  ].join("\n");
}

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function formatNumber(value: number): string {
  return value.toLocaleString("fr-FR", {
    maximumFractionDigits: 1
  });
}
