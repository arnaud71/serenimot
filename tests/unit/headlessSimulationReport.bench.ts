import { describe, expect, it } from "vitest";
import dictionaryText from "../../public/static/dictionary/lexique4005.txt?raw";
import { loadDictionaryFromText } from "../../src/domain/rules/dictionary";
import {
  formatHeadlessSimulationReport,
  runHeadlessSimulationReport
} from "../../src/domain/turns/headlessSimulation";

loadDictionaryFromText(dictionaryText);

describe("rapport de simulation sans interface", () => {
  it("agrège plusieurs parties ordinateur contre ordinateur", () => {
    const report = runHeadlessSimulationReport({
      games: 8,
      boardSize: 9,
      humanLevel: "very-easy",
      computerLevel: "very-easy",
      maxTurns: 80,
      seed: 123
    });

    console.info(`\n${formatHeadlessSimulationReport(report)}\n`);

    expect(report.games).toBe(8);
    expect(report.gameSummaries).toHaveLength(8);
    expect(report.averageTurns).toBeGreaterThan(0);
    expect(report.averageDurationMs).toBeGreaterThanOrEqual(0);
    expect(report.totalWordsPlayed).toBeGreaterThan(0);
  }, 30_000);
});
