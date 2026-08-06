import { describe, expect, it } from "vitest";
import dictionaryText from "../../public/static/dictionary/lexique4005.txt?raw";
import { loadDictionaryFromText } from "../../src/domain/rules/dictionary";
import { getPlacedTiles } from "../../src/domain/rules/validation";
import { runHeadlessComputerGame } from "../../src/domain/turns/headlessSimulation";
import { BoardSize } from "../../src/domain/tiles/types";

loadDictionaryFromText(dictionaryText);

const GRID_SIZES: BoardSize[] = [9, 11, 13, 15, 17];

describe("stress test par taille de grille", () => {
  it("compare les tailles de grille avec le même niveau de recherche", () => {
    const rows = GRID_SIZES.map((boardSize, index) => {
      const result = runHeadlessComputerGame({
        boardSize,
        humanLevel: "normal",
        computerLevel: "normal",
        maxTurns: 12,
        random: createSeededRandom(80_000 + index)
      });
      const words = result.history.flatMap((turn) => turn.words);
      const totalScore = result.state.scores.human + result.state.scores.computer;
      const words5Plus = words.filter((word) => word.length >= 5).length;

      return {
        grille: `${boardSize}x${boardSize}`,
        tours: result.turnsPlayed,
        terminee: result.finished,
        dureeMs: round(result.durationMs),
        msParTour: round(result.durationMs / result.turnsPlayed),
        scoreTotal: totalScore,
        scoreParTour: round(totalScore / result.turnsPlayed),
        motsJoues: words.length,
        longueurMoyenne: round(words.reduce((sum, word) => sum + word.length, 0) / Math.max(words.length, 1)),
        mots5Plus: words5Plus,
        etatIncoherent: getPlacedTiles(result.state.board).length
      };
    });

    console.table(rows);

    expect(rows).toHaveLength(GRID_SIZES.length);
    expect(rows.every((row) => row.tours === 12 || row.terminee)).toBe(true);
    expect(rows.every((row) => row.etatIncoherent === 0)).toBe(true);
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
