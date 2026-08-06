import { describe, expect, it } from "vitest";
import dictionaryText from "../../public/static/dictionary/lexique4005.txt?raw";
import { loadDictionaryFromText } from "../../src/domain/rules/dictionary";
import { getPlacedTiles } from "../../src/domain/rules/validation";
import { runHeadlessComputerGame } from "../../src/domain/turns/headlessSimulation";
import { BoardSize } from "../../src/domain/tiles/types";

loadDictionaryFromText(dictionaryText);

const GRID_SIZES: BoardSize[] = [9, 11, 13, 15, 17];
const GAMES_PER_GRID = 2;
const MAX_TURNS_PER_GAME = 20;

describe("benchmark parties longues par taille de grille", () => {
  it("compare les tailles de grille sur des parties plus avancées", () => {
    const rows = GRID_SIZES.map((boardSize, gridIndex) => {
      let finished = 0;
      let totalDurationMs = 0;
      let maxDurationMs = 0;
      let totalTurns = 0;
      let totalWords = 0;
      let totalWordLetters = 0;
      let totalScore = 0;
      let totalWords5Plus = 0;
      let incoherentStates = 0;

      for (let gameIndex = 0; gameIndex < GAMES_PER_GRID; gameIndex += 1) {
        const result = runHeadlessComputerGame({
          boardSize,
          humanLevel: "normal",
          computerLevel: "normal",
          maxTurns: MAX_TURNS_PER_GAME,
          random: createSeededRandom(200_000 + gridIndex * 10_000 + gameIndex)
        });
        const words = result.history.flatMap((turn) => turn.words);
        const score = result.state.scores.human + result.state.scores.computer;

        finished += result.finished ? 1 : 0;
        totalDurationMs += result.durationMs;
        maxDurationMs = Math.max(maxDurationMs, result.durationMs);
        totalTurns += result.turnsPlayed;
        totalWords += words.length;
        totalWordLetters += words.reduce((sum, word) => sum + word.length, 0);
        totalWords5Plus += words.filter((word) => word.length >= 5).length;
        totalScore += score;

        if (getPlacedTiles(result.state.board).length > 0 || result.turnsPlayed > MAX_TURNS_PER_GAME || score < 0) {
          incoherentStates += 1;
        }
      }

      return {
        grille: `${boardSize}x${boardSize}`,
        simulations: GAMES_PER_GRID,
        toursMax: MAX_TURNS_PER_GAME,
        terminees: finished,
        toursMoyens: round(totalTurns / GAMES_PER_GRID),
        dureeMoyenneMs: round(totalDurationMs / GAMES_PER_GRID),
        dureeMaxMs: round(maxDurationMs),
        msParTour: round(totalDurationMs / totalTurns),
        scoreMoyen: round(totalScore / GAMES_PER_GRID),
        scoreParTour: round(totalScore / totalTurns),
        motsParSimulation: round(totalWords / GAMES_PER_GRID),
        longueurMoyenne: round(totalWordLetters / Math.max(totalWords, 1)),
        partMots5PlusPct: round((totalWords5Plus / Math.max(totalWords, 1)) * 100),
        etatsIncoherents: incoherentStates
      };
    });

    console.table(rows);

    expect(rows.every((row) => row.etatsIncoherents === 0)).toBe(true);
    expect(rows.every((row) => row.motsParSimulation > 0)).toBe(true);
  }, 900_000);
});

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
