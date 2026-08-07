import { describe, expect, it } from "vitest";
import dictionaryText from "../../public/static/dictionary/lexique4005.txt?raw";
import { loadDictionaryFromText } from "../../src/domain/rules/dictionary";
import { getPlacedTiles } from "../../src/domain/rules/validation";
import { runHeadlessComputerGame } from "../../src/domain/turns/headlessSimulation";

loadDictionaryFromText(dictionaryText);

describe("simulation sans interface", () => {
  it("fait jouer deux joueurs automatiques avec le moteur de jeu réel", () => {
    const result = runHeadlessComputerGame({
      boardSize: 9,
      humanLevel: "very-easy",
      computerLevel: "very-easy",
      maxTurns: 20,
      searchProfile: "safe",
      random: () => 0.42
    });

    expect(result.turnsPlayed).toBeGreaterThan(0);
    expect(result.turnsPlayed).toBeLessThanOrEqual(20);
    expect(result.history.length).toBe(result.turnsPlayed);
    expect(getPlacedTiles(result.state.board)).toHaveLength(0);
    expect(result.state.scores.human + result.state.scores.computer).toBeGreaterThan(0);
  }, 15_000);
});
