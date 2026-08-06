import { describe, expect, it } from "vitest";
import dictionaryText from "../../public/static/dictionary/lexique4005.txt?raw";
import { loadDictionaryFromText } from "../../src/domain/rules/dictionary";
import { getPlacedTiles } from "../../src/domain/rules/validation";
import { OpponentLevel } from "../../src/domain/turns/game";
import { runHeadlessComputerGame } from "../../src/domain/turns/headlessSimulation";
import { BoardSize } from "../../src/domain/tiles/types";

loadDictionaryFromText(dictionaryText);

type StressScenario = {
  level: OpponentLevel;
  boardSize: BoardSize;
  games: number;
  maxTurns: number;
  slowGameMs: number;
};

const STRESS_SCENARIOS: StressScenario[] = [
  { level: "very-easy", boardSize: 9, games: 8, maxTurns: 35, slowGameMs: 2_000 },
  { level: "easy", boardSize: 9, games: 3, maxTurns: 25, slowGameMs: 7_500 },
  { level: "normal", boardSize: 9, games: 2, maxTurns: 15, slowGameMs: 35_000 },
  { level: "hard", boardSize: 9, games: 1, maxTurns: 8, slowGameMs: 35_000 },
  { level: "expert", boardSize: 9, games: 1, maxTurns: 8, slowGameMs: 35_000 }
];

describe("stress test sans interface", () => {
  it("enchaîne des simulations bornées sans état incohérent ni blocage manifeste", () => {
    const rows = STRESS_SCENARIOS.map((scenario, scenarioIndex) => {
      let finished = 0;
      let slowGames = 0;
      let totalTurns = 0;
      let totalDurationMs = 0;
      let maxDurationMs = 0;
      let incoherentStates = 0;

      for (let gameIndex = 0; gameIndex < scenario.games; gameIndex += 1) {
        const result = runHeadlessComputerGame({
          boardSize: scenario.boardSize,
          humanLevel: scenario.level,
          computerLevel: scenario.level,
          maxTurns: scenario.maxTurns,
          random: createSeededRandom(50_000 + scenarioIndex * 1_000 + gameIndex)
        });

        finished += result.finished ? 1 : 0;
        totalTurns += result.turnsPlayed;
        totalDurationMs += result.durationMs;
        maxDurationMs = Math.max(maxDurationMs, result.durationMs);
        slowGames += result.durationMs > scenario.slowGameMs ? 1 : 0;

        if (getPlacedTiles(result.state.board).length > 0 || result.turnsPlayed > scenario.maxTurns) {
          incoherentStates += 1;
        }
      }

      return {
        niveau: scenario.level,
        grille: `${scenario.boardSize}x${scenario.boardSize}`,
        parties: scenario.games,
        terminees: finished,
        tours: totalTurns,
        dureeTotaleMs: round(totalDurationMs),
        dureeMoyenneMs: round(totalDurationMs / scenario.games),
        dureeMaxMs: round(maxDurationMs),
        partiesLentes: slowGames,
        etatsIncoherents: incoherentStates
      };
    });

    console.table(rows);

    expect(rows.every((row) => row.etatsIncoherents === 0)).toBe(true);
  }, 180_000);
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
