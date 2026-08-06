import { describe, expect, it } from "vitest";
import dictionaryText from "../../public/static/dictionary/lexique4005.txt?raw";
import { loadDictionaryFromText } from "../../src/domain/rules/dictionary";
import { getPlacedTiles } from "../../src/domain/rules/validation";
import { runHeadlessComputerGame } from "../../src/domain/turns/headlessSimulation";

loadDictionaryFromText(dictionaryText);

const GAMES = 100;
const BOARD_SIZE = 9;
const MAX_TURNS = 6;

describe("stress test ciblé 9x9", () => {
  it("enchaîne 100 simulations 9x9 en niveau normal", () => {
    const durations: number[] = [];
    let finished = 0;
    let totalTurns = 0;
    let totalWords = 0;
    let totalWordLetters = 0;
    let totalScore = 0;
    let noWordGames = 0;
    let incoherentStates = 0;

    for (let gameIndex = 0; gameIndex < GAMES; gameIndex += 1) {
      const result = runHeadlessComputerGame({
        boardSize: BOARD_SIZE,
        humanLevel: "normal",
        computerLevel: "normal",
        maxTurns: MAX_TURNS,
        random: createSeededRandom(300_000 + gameIndex)
      });
      const words = result.history.flatMap((turn) => turn.words);
      const score = result.state.scores.human + result.state.scores.computer;

      durations.push(result.durationMs);
      finished += result.finished ? 1 : 0;
      totalTurns += result.turnsPlayed;
      totalWords += words.length;
      totalWordLetters += words.reduce((sum, word) => sum + word.length, 0);
      totalScore += score;

      if (words.length === 0) {
        noWordGames += 1;
      }

      if (getPlacedTiles(result.state.board).length > 0 || result.turnsPlayed > MAX_TURNS || score < 0) {
        incoherentStates += 1;
      }
    }

    durations.sort((first, second) => first - second);
    const row = {
      grille: "9x9",
      niveau: "normal",
      simulations: GAMES,
      toursMax: MAX_TURNS,
      terminees: finished,
      toursTotal: totalTurns,
      dureeTotaleMs: round(sum(durations)),
      dureeMoyenneMs: round(sum(durations) / GAMES),
      p95Ms: round(percentile(durations, 0.95)),
      dureeMaxMs: round(durations[durations.length - 1] ?? 0),
      scoreMoyen: round(totalScore / GAMES),
      motsTotal: totalWords,
      motsParSimulation: round(totalWords / GAMES),
      longueurMoyenne: round(totalWordLetters / Math.max(totalWords, 1)),
      sansMot: noWordGames,
      etatsIncoherents: incoherentStates
    };

    console.table([row]);

    expect(row.etatsIncoherents).toBe(0);
    expect(row.sansMot).toBe(0);
    expect(row.toursTotal).toBe(GAMES * MAX_TURNS);
  }, 900_000);
});

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function percentile(values: number[], ratio: number): number {
  if (values.length === 0) {
    return 0;
  }

  return values[Math.min(values.length - 1, Math.floor((values.length - 1) * ratio))];
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
