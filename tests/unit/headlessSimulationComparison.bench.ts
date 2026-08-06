import { describe, expect, it } from "vitest";
import dictionaryText from "../../public/static/dictionary/lexique4005.txt?raw";
import { loadDictionaryFromText } from "../../src/domain/rules/dictionary";
import { OpponentLevel } from "../../src/domain/turns/game";
import { runHeadlessSimulationReport } from "../../src/domain/turns/headlessSimulation";

loadDictionaryFromText(dictionaryText);

type Scenario = {
  label: string;
  level: OpponentLevel;
  games: number;
  maxTurns: number;
};

const scenarios: Scenario[] = [
  { label: "Très facile", level: "very-easy", games: 2, maxTurns: 25 },
  { label: "Facile", level: "easy", games: 2, maxTurns: 25 },
  { label: "Normal", level: "normal", games: 2, maxTurns: 25 }
];

describe("comparaison des niveaux en simulation sans interface", () => {
  it("compare plusieurs niveaux sur plusieurs parties", () => {
    const rows = scenarios.map((scenario, index) => {
      const report = runHeadlessSimulationReport({
        games: scenario.games,
        boardSize: 9,
        humanLevel: scenario.level,
        computerLevel: scenario.level,
        maxTurns: scenario.maxTurns,
        seed: 500 + index * 100
      });

      return {
        niveau: scenario.label,
        parties: report.games,
        terminees: report.finished,
        toursMoyens: format(report.averageTurns),
        dureeMoyenneMs: format(report.averageDurationMs),
        scoreJoueur: format(report.averageScores.human),
        scoreOrdinateur: format(report.averageScores.computer),
        motsParPartie: format(report.averageWordsPerGame),
        longueurMoyenne: format(report.averageWordLength),
        mots2Lettres: report.wordsByLength[2] ?? 0,
        mots3Lettres: report.wordsByLength[3] ?? 0,
        mots4Plus: Object.entries(report.wordsByLength)
          .filter(([length]) => Number(length) >= 4)
          .reduce((sum, [, count]) => sum + count, 0)
      };
    });

    console.table(rows);

    expect(rows).toHaveLength(scenarios.length);
    expect(rows.every((row) => row.motsParPartie > 0)).toBe(true);
  }, 60_000);
});

function format(value: number): number {
  return Math.round(value * 10) / 10;
}
