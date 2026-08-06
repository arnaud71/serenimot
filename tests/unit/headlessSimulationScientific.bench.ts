import { describe, expect, it } from "vitest";
import dictionaryText from "../../public/static/dictionary/lexique4005.txt?raw";
import { loadDictionaryFromText } from "../../src/domain/rules/dictionary";
import { OpponentLevel } from "../../src/domain/turns/game";
import { HeadlessSimulationReport, runHeadlessSimulationReport } from "../../src/domain/turns/headlessSimulation";

loadDictionaryFromText(dictionaryText);

type ScientificScenario = {
  label: string;
  level: OpponentLevel;
  games: number;
  maxTurns: number;
};

const SCIENTIFIC_SCENARIOS: ScientificScenario[] = [
  { label: "Très facile", level: "very-easy", games: 10, maxTurns: 35 },
  { label: "Facile", level: "easy", games: 8, maxTurns: 35 },
  { label: "Normal", level: "normal", games: 3, maxTurns: 25 },
  { label: "Difficile", level: "hard", games: 1, maxTurns: 12 },
  { label: "Expert", level: "expert", games: 1, maxTurns: 8 }
];

describe("benchmark scientifique sans interface", () => {
  it("compare les niveaux avec un protocole reproductible et des métriques normalisées", () => {
    const rows = SCIENTIFIC_SCENARIOS.map((scenario, index) => {
      const report = runHeadlessSimulationReport({
        games: scenario.games,
        boardSize: 9,
        humanLevel: scenario.level,
        computerLevel: scenario.level,
        maxTurns: scenario.maxTurns,
        seed: 10_000 + index * 1_000
      });

      return summarizeScenario(scenario, report);
    });

    console.info(
      [
        "",
        "Protocole benchmark scientifique Sérénimot",
        "- Grille : 9x9",
        "- Les deux joueurs automatiques utilisent le même niveau dans chaque scénario.",
        "- Les graines sont fixes et distinctes par scénario.",
        "- Les niveaux coûteux sont volontairement limités en nombre de parties/tours pour éviter les blocages mémoire/temps.",
        ""
      ].join("\n")
    );
    console.table(rows);

    expect(rows).toHaveLength(SCIENTIFIC_SCENARIOS.length);
    expect(rows.every((row) => row.toursJoues > 0)).toBe(true);
    expect(rows.every((row) => row.motsJoues > 0)).toBe(true);
  }, 600_000);
});

function summarizeScenario(scenario: ScientificScenario, report: HeadlessSimulationReport) {
  const turns = report.gameSummaries.reduce((sum, game) => sum + game.turns, 0);
  const scoreTotal = report.averageScores.human + report.averageScores.computer;
  const shortWords = (report.wordsByLength[2] ?? 0) + (report.wordsByLength[3] ?? 0);
  const longWords = Object.entries(report.wordsByLength)
    .filter(([length]) => Number(length) >= 5)
    .reduce((sum, [, count]) => sum + count, 0);

  return {
    niveau: scenario.label,
    parties: report.games,
    toursMax: scenario.maxTurns,
    terminees: report.finished,
    toursJoues: turns,
    dureeMs: round(report.durationMs),
    msParTour: round(report.durationMs / turns),
    scoreMoyenTotal: round(scoreTotal),
    scoreParTour: round((scoreTotal * report.games) / turns),
    motsJoues: report.totalWordsPlayed,
    motsParTour: round(report.totalWordsPlayed / turns),
    longueurMoyenne: round(report.averageWordLength),
    partMotsCourtsPct: round((shortWords / report.totalWordsPlayed) * 100),
    partMots5PlusPct: round((longWords / report.totalWordsPlayed) * 100),
    topMots: report.mostPlayedWords
      .slice(0, 5)
      .map((entry) => entry.word)
      .join(", ")
  };
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
