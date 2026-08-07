import { beforeEach, describe, expect, it } from "vitest";
import wordExplanationPriorityReport from "../../lexicon/reviews/word-explanations-priority-report.json";
import dictionaryText from "../../public/static/dictionary/lexique4005.txt?raw";
import wordExplanations2Text from "../../public/static/dictionary/lexique4005.explanations-2.json?raw";
import wordExplanations3Text from "../../public/static/dictionary/lexique4005.explanations-3.json?raw";
import wordExplanations4Text from "../../public/static/dictionary/lexique4005.explanations-4.json?raw";
import wordExplanationsRText from "../../public/static/dictionary/lexique4005.explanations-r.json?raw";
import wordExplanationsSText from "../../public/static/dictionary/lexique4005.explanations-s.json?raw";
import wordExplanationsVText from "../../public/static/dictionary/lexique4005.explanations-v.json?raw";
import wordExplanationsManifest from "../../public/static/dictionary/lexique4005.explanations.manifest.json";
import { createBoard } from "../../src/domain/board/board";
import {
  createNewGame,
  createBoardTileToken,
  getComputerMoveSearchLimit,
  getComputerSearchBudgetMs,
  isGameFinished,
  moveHumanTurnWord,
  passHumanTurn,
  placeTile,
  placeWord,
  playEasyComputerTurn,
  recordHumanHintUse,
  exchangeHumanTiles,
  undoHumanTurn,
  validatePreparedHint,
  validateHumanTurn
} from "../../src/domain/turns/game";
import { findBestHumanMove } from "../../src/domain/turns/hints";
import { CENTER, PlacedTile } from "../../src/domain/tiles/types";
import { validateTurn } from "../../src/domain/rules/validation";
import { getDictionarySize, isWordAccepted, loadDictionaryFromText } from "../../src/domain/rules/dictionary";
import { getWordCheckResult } from "../../src/domain/rules/wordCheck";
import { getTileCountForBoardSize } from "../../src/domain/tiles/bag";
import {
  formatWordExplanationDefinition,
  getKnownWordExplanations,
  getWordExplanation,
  loadWordExplanationsFromText,
  searchWordExplanations,
  WORD_EXPLANATION_LENGTHS,
  WORD_EXPLANATION_INITIAL_FILE_PATHS,
  WORD_EXPLANATION_INITIALS
} from "../../src/domain/rules/wordExplanations";
import { explainTurnScore, scoreTurnWords } from "../../src/domain/scoring/scoring";
import {
  DEFAULT_PREFERENCES,
  loadPreferences,
  PREFERENCES_STORAGE_KEY,
  savePreferences
} from "../../src/features/accessibility/preferences";

const wordExplanationsText = JSON.stringify({
  entries: [
    wordExplanations2Text,
    wordExplanations3Text,
    wordExplanations4Text,
    wordExplanationsRText,
    wordExplanationsSText,
    wordExplanationsVText
  ].flatMap((source) => JSON.parse(source).entries)
});

loadDictionaryFromText(dictionaryText);
loadWordExplanationsFromText(wordExplanationsText);

beforeEach(() => {
  localStorage.removeItem(PREFERENCES_STORAGE_KEY);
});

function createTestGame() {
  return createNewGame({ useDemoBag: true });
}

function placeOpeningWord() {
  let state = createTestGame();
  const letters = ["S", "E", "R", "E", "I", "N"];

  letters.forEach((letter, index) => {
    const tile = state.racks.human.find((candidate) => candidate.letter === letter);
    expect(tile).toBeDefined();
    const result = placeTile(state, tile?.id ?? "", CENTER, CENTER + index);
    expect(result.ok).toBe(true);
    state = result.state;
  });

  return state;
}

describe("plateau", () => {
  it("conserve les options entre les parties", () => {
    savePreferences({
      ...DEFAULT_PREFERENCES,
      boardSize: 17,
      opponentLevel: "hard",
      computerSearchProfile: "auto",
      hintMode: "complete",
      soundEnabled: false,
      soundVolume: 35,
      textScale: "small"
    });

    expect(loadPreferences()).toMatchObject({
      boardSize: 17,
      opponentLevel: "hard",
      computerSearchProfile: "auto",
      hintMode: "complete",
      soundEnabled: false,
      soundVolume: 35,
      textScale: "small"
    });
  });

  it("charge le dictionnaire complet depuis le fichier statique", () => {
    expect(getDictionarySize()).toBeGreaterThan(100_000);
  });

  it("garde les petits mots lexicalisés et refuse les abréviations", () => {
    expect(isWordAccepted("AA")).toBe(true);
    expect(isWordAccepted("AC")).toBe(false);
    expect(isWordAccepted("AM")).toBe(false);
    expect(isWordAccepted("GA")).toBe(false);
    expect(isWordAccepted("GI")).toBe(false);
    expect(isWordAccepted("ID")).toBe(false);
    expect(isWordAccepted("JA")).toBe(false);
    expect(isWordAccepted("MM")).toBe(false);
    expect(isWordAccepted("PA")).toBe(false);
    expect(isWordAccepted("YA")).toBe(false);
    expect(isWordAccepted("DIAM")).toBe(true);
    expect(isWordAccepted("BCBG")).toBe(false);
    expect(isWordAccepted("AGRO")).toBe(false);
    expect(isWordAccepted("AJAX")).toBe(false);
    expect(isWordAccepted("LSD")).toBe(false);
    expect(isWordAccepted("PC")).toBe(false);
    expect(isWordAccepted("TT")).toBe(false);
    expect(isWordAccepted("ALAIN")).toBe(false);
    expect(isWordAccepted("BERLIN")).toBe(false);
    expect(isWordAccepted("LORSQU")).toBe(false);
  });

  it("fournit les explications pré-calculées des mots revus", () => {
    expect(getWordExplanation("DIAM")).toMatchObject({
      partOfSpeech: "nom masculin",
      lemma: "diamant",
      reviewed: true
    });
    expect(getWordExplanation("QI")).toMatchObject({
      partOfSpeech: "nom masculin",
      reviewed: true
    });
    const generatedExplanation = getWordExplanation("ABC");

    expect(generatedExplanation).toMatchObject({
      partOfSpeech: "nom masculin",
      reviewed: false
    });
    expect(generatedExplanation?.shortDefinition).toContain("alphabet");
    expect(generatedExplanation?.sources.map((source) => source.name)).toContain("Wiktionnaire");
    expect(getWordExplanation("ETES")).toMatchObject({
      baseWord: "ETRE",
      formNote: "Forme du verbe être.",
      partOfSpeech: "verbe",
      shortDefinition: "Exister ; se trouver dans un état ou une situation."
    });
    expect(formatWordExplanationDefinition(getWordExplanation("ETES")!)).toBe(
      "Forme du verbe être. Exister ; se trouver dans un état ou une situation."
    );
    expect(getWordExplanation("VA")).toMatchObject({
      baseWord: "ALLER",
      formNote: "Forme du verbe aller.",
      partOfSpeech: "verbe",
      shortDefinition: "Se déplacer ; convenir ou fonctionner correctement."
    });
    expect(formatWordExplanationDefinition(getWordExplanation("VA")!)).toBe(
      "Forme du verbe aller. Se déplacer ; convenir ou fonctionner correctement."
    );
    const pluralExplanation = getWordExplanation("FETES");

    expect(pluralExplanation).toMatchObject({
      baseWord: "FETE",
      formNote: "Pluriel de FETE.",
      partOfSpeech: "nom féminin pluriel",
      shortDefinition: "Réjouissance ou célébration."
    });
    expect(pluralExplanation ? formatWordExplanationDefinition(pluralExplanation) : "").toBe(
      "Pluriel de FETE. Réjouissance ou célébration."
    );
    expect(getWordExplanation("VALS")).toMatchObject({
      baseWord: "VAL",
      formNote: "Pluriel de VAL.",
      partOfSpeech: "nom masculin pluriel",
      shortDefinition: getWordExplanation("VAL")?.shortDefinition
    });
    expect(formatWordExplanationDefinition(getWordExplanation("QINS")!)).toBe("Pluriel de QIN. Guqin.");
    expect(getWordExplanation("VOLIGEA")).toMatchObject({
      shortDefinition: "Troisième personne du singulier du passé simple du verbe voliger. VOLIGER : Garnir un toit de voliges."
    });
    expect(getWordExplanation("VOLIGEA")).not.toHaveProperty("usage");
    expect(getWordExplanation("RAVAGEAIS")).toMatchObject({
      baseWord: "RAVAGER",
      formNote: "Forme du verbe ravager.",
      partOfSpeech: "verbe",
      shortDefinition: "Faire du ravage."
    });
    expect(getWordExplanation("MM")).toBeNull();
  });

  it("garde les explications pré-calculées alignées avec les mots jouables", () => {
    const explanations = getKnownWordExplanations();

    expect(wordExplanationsManifest.totalEntries).toBe(170129);
    expect(explanations.every((entry) => isWordAccepted(entry.word))).toBe(true);
    expect(
      dictionaryText
        .split(/\r?\n/)
        .filter((word) => word.length === 2)
        .every((word) => Boolean(getWordExplanation(word)))
    ).toBe(true);
    expect(wordExplanationsManifest.files.byLength.map((file) => file.length)).toEqual(WORD_EXPLANATION_LENGTHS);
    expect(wordExplanationsManifest.files.byInitial).toHaveLength(26);
    expect(wordExplanationsManifest.files.byInitial.map((file) => file.initial)).toEqual(WORD_EXPLANATION_INITIALS);
    expect(WORD_EXPLANATION_INITIAL_FILE_PATHS.a).toContain("lexique4005.explanations-a.json");
    expect(WORD_EXPLANATION_INITIAL_FILE_PATHS.z).toContain("lexique4005.explanations-z.json");
    expect(wordExplanationsManifest.files.byInitial.reduce((total, file) => total + file.entries, 0)).toBe(
      wordExplanationsManifest.totalEntries
    );
    expect(
      dictionaryText
        .split(/\r?\n/)
        .filter((word) => word.length === 3)
        .every((word) => Boolean(getWordExplanation(word)))
    ).toBe(true);
    expect(
      dictionaryText
        .split(/\r?\n/)
        .filter((word) => word.length === 4)
        .every((word) => Boolean(getWordExplanation(word)))
    ).toBe(true);
    expect(explanations.filter((entry) => entry.word.length === 3 && entry.sources.some((source) => source.name === "Wiktionnaire"))).toHaveLength(516);
    expect(explanations.filter((entry) => entry.word.length === 4 && entry.sources.some((source) => source.name === "Wiktionnaire"))).toHaveLength(2401);
  });

  it("filtre les explications pré-calculées par mot ou contenu", () => {
    expect(searchWordExplanations("qi").map((entry) => entry.word)).toEqual(
      expect.arrayContaining(["QI", "QIN", "QINS"])
    );
    expect(searchWordExplanations("monnaie").map((entry) => entry.word)).toEqual(
      expect.arrayContaining(["WON", "WONS", "YEN", "YENS"])
    );
    expect(searchWordExplanations("cereale").map((entry) => entry.word)).toEqual(
      expect.arrayContaining(["BLE", "BLES", "EPI", "EPIS"])
    );
    expect(searchWordExplanations("fete").map((entry) => entry.word)).toEqual(
      expect.arrayContaining(["FETE", "FETES"])
    );
    const vaResults = searchWordExplanations("va").map((entry) => entry.word);
    expect(vaResults[0]).toBe("VA");
    expect(vaResults).toEqual(expect.arrayContaining(["VAIS", "VAS"]));
    expect(vaResults).not.toEqual(expect.arrayContaining(["ARE", "AVAIS", "AVAIT"]));
    expect(searchWordExplanations("zzzzz")).toEqual([]);
  });

  it("teste un mot dans le lexique actif", () => {
    expect(getWordCheckResult("diam")).toMatchObject({
      status: "accepted",
      label: "DIAM est accepté",
      normalizedWord: "DIAM",
      explanation: {
        word: "DIAM",
        lemma: "diamant"
      }
    });
    expect(getWordCheckResult("étoile")).toMatchObject({
      status: "accepted",
      label: "ETOILE est accepté",
      normalizedWord: "ETOILE"
    });
    expect(getWordCheckResult("serein")).toMatchObject({
      status: "accepted",
      label: "SEREIN est accepté",
      normalizedWord: "SEREIN",
      detail: "Ce mot est reconnu dans Lexique Sérénimot 4.00.5 et dispose d'une fiche explicative.",
      explanation: {
        word: "SEREIN",
        reviewed: false
      }
    });
    const rejectedWordCheck = getWordCheckResult("mm");

    expect(rejectedWordCheck).toMatchObject({
      status: "rejected",
      label: "MM n'est pas reconnu",
      normalizedWord: "MM"
    });
    expect(rejectedWordCheck).not.toHaveProperty("explanation");
  });

  it("fournit une file de priorité pour les prochaines explications", () => {
    expect(wordExplanationPriorityReport.counts.explainedWords).toBe(170129);
    expect(wordExplanationPriorityReport.counts.exportedRows).toBe(0);
    expect(wordExplanationPriorityReport.topWords).not.toContain("JE");
    expect(wordExplanationPriorityReport.topWords).not.toContain("VA");
    expect(wordExplanationPriorityReport.topWords).not.toContain("DIAM");
  });

  it("accepte les formes dérivées sûres et garde les formes rares en revue", () => {
    expect(isWordAccepted("abaissantes")).toBe(true);
    expect(isWordAccepted("abaissements")).toBe(true);
    expect(isWordAccepted("abaissai")).toBe(true);
    expect(isWordAccepted("abaisseriez")).toBe(true);
    expect(isWordAccepted("abaissions")).toBe(true);
    expect(isWordAccepted("abaissassions")).toBe(true);
    expect(isWordAccepted("abacule")).toBe(true);
    expect(isWordAccepted("aberrerions")).toBe(true);
    expect(isWordAccepted("aalenienne")).toBe(true);
    expect(isWordAccepted("boosterions")).toBe(true);
    expect(isWordAccepted("abondez")).toBe(true);
    expect(isWordAccepted("disez")).toBe(true);
    expect(isWordAccepted("alicante")).toBe(false);
    expect(isWordAccepted("accreterions")).toBe(false);
  });

  it("crée une grille originale de 13 par 13 avec une case centrale", () => {
    const board = createBoard();

    expect(board).toHaveLength(13);
    expect(board[0]).toHaveLength(13);
    expect(board[CENTER][CENTER].bonus).toBe("calm");
    expect(board[1][1].bonus).toBe("letter3");
    expect(board[0][0].bonus).toBe("word3");
    expect(board[5][5].bonus).toBe("plain");
    expect(countBonus(board, "word")).toBe(4);
    expect(countBonus(board, "letter")).toBe(8);
    expect(countBonus(board, "word3")).toBe(4);
    expect(countBonus(board, "letter3")).toBe(4);
  });

  it("augmente les cases spéciales sur les grandes grilles", () => {
    const smallBoard = createBoard(9);
    const standardBoard = createBoard(13);
    const largeBoard = createBoard(17);

    expect(countSpecialBonus(smallBoard)).toBeLessThan(countSpecialBonus(standardBoard));
    expect(countSpecialBonus(largeBoard)).toBeGreaterThan(countSpecialBonus(standardBoard));
    expect(countBonus(largeBoard, "word3")).toBe(4);
    expect(countBonus(largeBoard, "letter3")).toBeGreaterThan(countBonus(standardBoard, "letter3"));
  });
});

describe("tour du joueur", () => {
  it("donne plus de temps de réflexion aux niveaux forts de l'ordinateur", () => {
    expect(getComputerSearchBudgetMs("expert")).toBeGreaterThan(getComputerSearchBudgetMs("hard"));
    expect(getComputerSearchBudgetMs("hard")).toBeGreaterThan(getComputerSearchBudgetMs("normal"));
    expect(getComputerSearchBudgetMs("normal")).toBeGreaterThan(getComputerSearchBudgetMs("easy"));
    expect(getComputerMoveSearchLimit("expert")).toBeGreaterThan(getComputerMoveSearchLimit("hard"));
    expect(getComputerMoveSearchLimit("hard")).toBeGreaterThan(getComputerMoveSearchLimit("normal"));
  });

  it("adapte les budgets de recherche selon le profil de performance", () => {
    expect(getComputerSearchBudgetMs("normal", "safe")).toBeLessThan(getComputerSearchBudgetMs("normal"));
    expect(getComputerSearchBudgetMs("normal", "quality")).toBeGreaterThan(getComputerSearchBudgetMs("normal"));
    expect(getComputerMoveSearchLimit("hard", "safe")).toBeLessThan(getComputerMoveSearchLimit("hard"));
    expect(getComputerMoveSearchLimit("hard", "quality")).toBeGreaterThan(getComputerMoveSearchLimit("hard"));
  });

  it("termine la partie après plusieurs tours passés", () => {
    const state = {
      ...recordHumanHintUse(recordHumanHintUse(createTestGame(), "partial"), "complete"),
      passCount: 3,
      scores: {
        human: 21,
        computer: 18
      }
    };
    const finished = passHumanTurn(state);

    expect(isGameFinished(finished)).toBe(true);
    expect(finished.status).toMatchObject({
      state: "finished",
      winner: "human",
      reason: "consecutive-passes",
      finalScores: {
        human: 21,
        computer: 18
      },
      stats: {
        hints: {
          partial: 1,
          complete: 1
        }
      }
    });
  });

  it("initialise les statistiques de partie", () => {
    const state = createTestGame();

    expect(state.stats).toEqual({
      humanTurns: 0,
      computerTurns: 0,
      passes: 0,
      exchanges: 0,
      hints: {
        partial: 0,
        complete: 0
      }
    });
  });

  it("termine la partie quand la pioche est vide et un chevalet terminé", () => {
    const state = {
      ...createTestGame(),
      bag: [],
      racks: {
        ...createTestGame().racks,
        human: []
      },
      scores: {
        human: 12,
        computer: 22
      }
    };
    const finished = passHumanTurn(state);

    expect(isGameFinished(finished)).toBe(true);
    expect(finished.status).toMatchObject({
      state: "finished",
      winner: "computer",
      reason: "rack-empty"
    });
  });

  it("ne termine pas la partie quand la pioche est vide mais qu'un nouveau mot reste possible", () => {
    const state = {
      ...createTestGame(),
      bag: [],
      racks: {
        human: [
          { id: "human-fin-1", letter: "A", value: 1 },
          { id: "human-fin-2", letter: "I", value: 1 },
          { id: "human-fin-3", letter: "R", value: 2 }
        ],
        computer: [
          { id: "computer-fin-1", letter: "Q", value: 6 }
        ]
      },
      scores: {
        human: 285,
        computer: 212
      }
    };
    const finished = passHumanTurn(state);

    expect(isGameFinished(finished)).toBe(false);
    expect(finished.status).toMatchObject({
      state: "playing"
    });
  });

  it("termine la partie quand aucun nouveau mot ne peut être créé par les deux joueurs", () => {
    const state = {
      ...createTestGame(),
      bag: [],
      racks: {
        human: [{ id: "human-fin-1", letter: "Q", value: 6 }],
        computer: [{ id: "computer-fin-1", letter: "W", value: 8 }]
      },
      scores: {
        human: 285,
        computer: 212
      }
    };
    const finished = passHumanTurn(state);

    expect(isGameFinished(finished)).toBe(true);
    expect(finished.status).toMatchObject({
      state: "finished",
      winner: "human",
      reason: "no-moves",
      finalScores: {
        human: 285,
        computer: 212
      }
    });
  });

  it("échange des lettres du joueur puis passe le tour", () => {
    const state = {
      ...createTestGame(),
      racks: {
        human: [
          { id: "human-exchange-1", letter: "A", value: 1 },
          { id: "human-exchange-2", letter: "B", value: 4 },
          { id: "human-exchange-3", letter: "C", value: 3 }
        ],
        computer: []
      },
      bag: [
        { id: "bag-exchange-1", letter: "D", value: 3 },
        { id: "bag-exchange-2", letter: "E", value: 1 },
        { id: "bag-exchange-3", letter: "F", value: 4 }
      ],
      passCount: 0
    };

    const result = exchangeHumanTiles(state, ["human-exchange-1", "human-exchange-2"], () => 0);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.state.turn.player).toBe("computer");
    expect(result.state.passCount).toBe(1);
    expect(result.state.racks.human.map((tile) => tile.id)).toEqual([
      "human-exchange-3",
      "bag-exchange-1",
      "bag-exchange-2"
    ]);
    expect(result.state.bag.map((tile) => tile.id)).toEqual(
      expect.arrayContaining(["human-exchange-1", "human-exchange-2", "bag-exchange-3"])
    );
    expect(result.state.message.text).toContain("Vous échangez 2 lettres");
  });

  it("refuse l'échange quand la pioche ne contient pas assez de lettres", () => {
    const state = {
      ...createTestGame(),
      racks: {
        ...createTestGame().racks,
        human: [
          { id: "human-exchange-1", letter: "A", value: 1 },
          { id: "human-exchange-2", letter: "B", value: 4 }
        ]
      },
      bag: [{ id: "bag-exchange-1", letter: "D", value: 3 }]
    };

    const result = exchangeHumanTiles(state, ["human-exchange-1", "human-exchange-2"], () => 0);

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.reason).toBe(
      "La pioche ne permet plus d'échanger autant de lettres. Essayez de poser un mot ou passez votre tour."
    );
    expect(result.state).toBe(state);
  });

  it("termine la partie après un échange si aucun joueur ne peut créer de nouveau mot", () => {
    const state = {
      ...createTestGame(),
      racks: {
        human: [{ id: "human-exchange-1", letter: "Q", value: 6 }],
        computer: [{ id: "computer-exchange-1", letter: "W", value: 8 }]
      },
      bag: [{ id: "bag-exchange-1", letter: "Z", value: 8 }],
      scores: {
        human: 41,
        computer: 39
      }
    };

    const result = exchangeHumanTiles(state, ["human-exchange-1"], () => 0);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(isGameFinished(result.state)).toBe(true);
    expect(result.state.status).toMatchObject({
      state: "finished",
      winner: "human",
      reason: "no-moves",
      finalScores: {
        human: 41,
        computer: 39
      }
    });
  });

  it("reprend les lettres posées pendant le tour avant de les échanger", () => {
    const initialState = {
      ...createTestGame(),
      racks: {
        human: [
          { id: "human-exchange-1", letter: "A", value: 1 },
          { id: "human-exchange-2", letter: "B", value: 4 }
        ],
        computer: [
          { id: "computer-exchange-1", letter: "A", value: 1 },
          { id: "computer-exchange-2", letter: "I", value: 1 },
          { id: "computer-exchange-3", letter: "R", value: 2 }
        ]
      },
      bag: [
        { id: "bag-exchange-1", letter: "C", value: 3 },
        { id: "bag-exchange-2", letter: "D", value: 3 }
      ]
    };
    const placement = placeTile(initialState, "human-exchange-1", CENTER, CENTER);

    expect(placement.ok).toBe(true);
    if (!placement.ok) {
      return;
    }

    const result = exchangeHumanTiles(placement.state, ["human-exchange-1"], () => 0);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.state.board[CENTER][CENTER].tile).toBeNull();
    expect(result.state.turn).toEqual({ player: "computer", placedTileIds: [] });
    expect(result.state.racks.human.map((tile) => tile.id)).toEqual(["human-exchange-2", "bag-exchange-1"]);
    expect(result.state.bag.map((tile) => tile.id)).toEqual(
      expect.arrayContaining(["human-exchange-1", "bag-exchange-2"])
    );
  });

  it("refuse l'échange sans lettre sélectionnée", () => {
    const state = createTestGame();
    const result = exchangeHumanTiles(state, [], () => 0);

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.reason).toBe("Choisissez au moins une lettre à échanger.");
    expect(result.state).toBe(state);
  });

  it("mélange les lettres pour une nouvelle partie normale", () => {
    const firstGame = createNewGame({ random: () => 0 });
    const secondGame = createNewGame({ random: () => 0.9 });

    expect(firstGame.racks.human.map((tile) => tile.id)).not.toEqual(
      secondGame.racks.human.map((tile) => tile.id)
    );
  });

  it("peut limiter la pioche restante pour les parties de test", () => {
    const state = createNewGame({ remainingBagSize: 20, random: () => 0 });

    expect(state.racks.human).toHaveLength(8);
    expect(state.racks.computer).toHaveLength(8);
    expect(state.bag).toHaveLength(20);
  });

  it("adapte le nombre de pièces à la taille de la grille", () => {
    const smallGame = createNewGame({ boardSize: 9, random: () => 0 });
    const standardGame = createNewGame({ boardSize: 13, random: () => 0 });
    const largeGame = createNewGame({ boardSize: 17, random: () => 0 });

    expect(getTileCountForBoardSize(9)).toBeLessThan(getTileCountForBoardSize(13));
    expect(getTileCountForBoardSize(17)).toBeGreaterThan(getTileCountForBoardSize(13));
    expect(smallGame.racks.human.length + smallGame.racks.computer.length + smallGame.bag.length).toBe(
      getTileCountForBoardSize(9)
    );
    expect(standardGame.racks.human.length + standardGame.racks.computer.length + standardGame.bag.length).toBe(
      getTileCountForBoardSize(13)
    );
    expect(largeGame.racks.human.length + largeGame.racks.computer.length + largeGame.bag.length).toBe(
      getTileCountForBoardSize(17)
    );
  });

  it("place une lettre depuis le chevalet vers le plateau", () => {
    const state = createTestGame();
    const tile = state.racks.human[0];
    const result = placeTile(state, tile.id, CENTER, CENTER);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.board[CENTER][CENTER].tile?.letter).toBe(tile.letter);
      expect(result.state.racks.human).not.toContain(tile);
    }
  });

  it("reprend toutes les lettres du tour", () => {
    const state = createTestGame();
    const tile = state.racks.human[0];
    const placed = placeTile(state, tile.id, CENTER, CENTER);
    expect(placed.ok).toBe(true);

    const restored = undoHumanTurn(placed.state);

    expect(restored.board[CENTER][CENTER].tile).toBeNull();
    expect(restored.racks.human.some((candidate) => candidate.id === tile.id)).toBe(true);
  });

  it("prépare et pose un mot entier en une seule action", () => {
    const state = createTestGame();
    const availableRack = [...state.racks.human];
    const tileIds = ["S", "E", "R", "E", "I", "N"].map((letter) => {
      const tileIndex = availableRack.findIndex((candidate) => candidate.letter === letter);
      expect(tileIndex).toBeGreaterThanOrEqual(0);
      const [tile] = availableRack.splice(tileIndex, 1);
      return tile.id;
    });
    const result = placeWord(state, tileIds, CENTER, CENTER, "row");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.board[CENTER][CENTER].tile?.letter).toBe("S");
      expect(result.state.board[CENTER][CENTER + 5].tile?.letter).toBe("N");
      expect(result.state.racks.human).toHaveLength(2);
    }
  });

  it("refuse de poser un mot préparé qui n'existe pas", () => {
    const state = createTestGame();
    const availableRack = [...state.racks.human];
    const tileIds = ["S", "M", "O"].map((letter) => {
      const tileIndex = availableRack.findIndex((candidate) => candidate.letter === letter);
      expect(tileIndex).toBeGreaterThanOrEqual(0);
      const [tile] = availableRack.splice(tileIndex, 1);
      return tile.id;
    });

    const result = placeWord(state, tileIds, CENTER, CENTER, "row");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe(`Le mot "SMO" n'est pas reconnu dans le dictionnaire actuel.`);
      expect(result.state.board[CENTER][CENTER].tile).toBeNull();
      expect(result.state.racks.human).toHaveLength(8);
    }
  });

  it("déplace un mot posé tant qu'il n'est pas validé", () => {
    const state = createTestGame();
    const availableRack = [...state.racks.human];
    const tileIds = ["S", "E", "R", "E", "I", "N"].map((letter) => {
      const tileIndex = availableRack.findIndex((candidate) => candidate.letter === letter);
      expect(tileIndex).toBeGreaterThanOrEqual(0);
      const [tile] = availableRack.splice(tileIndex, 1);
      return tile.id;
    });
    const placed = placeWord(state, tileIds, CENTER, CENTER, "row");
    expect(placed.ok).toBe(true);

    if (placed.ok) {
      const moved = moveHumanTurnWord(placed.state, CENTER, CENTER, "col");

      expect(moved.ok).toBe(true);
      if (moved.ok) {
        expect(moved.state.board[CENTER][CENTER].tile?.letter).toBe("S");
        expect(moved.state.board[CENTER + 5][CENTER].tile?.letter).toBe("N");
        expect(moved.state.board[CENTER][CENTER + 5].tile).toBeNull();
        expect(moved.state.racks.human).toHaveLength(2);
      }
    }
  });

  it("refuse un premier mot qui ne passe pas par le centre", () => {
    const state = createTestGame();
    const tileA = state.racks.human[0];
    const placedA = placeTile(state, tileA.id, 0, 0);
    expect(placedA.ok).toBe(true);

    const tileB = placedA.state.racks.human[0];
    const placedB = placeTile(placedA.state, tileB.id, 0, 1);
    expect(placedB.ok).toBe(true);

    expect(validateTurn(placedB.state.board)).toEqual({
      ok: false,
      reason: "Le premier mot doit passer par la case centrale."
    });
  });

  it("refuse un mot qui laisse une case vide entre deux lettres", () => {
    const state = createTestGame();
    const firstTile = state.racks.human.find((tile) => tile.letter === "S");
    expect(firstTile).toBeDefined();
    const firstPlacement = placeTile(state, firstTile?.id ?? "", CENTER, CENTER);
    expect(firstPlacement.ok).toBe(true);

    const secondTile = firstPlacement.state.racks.human.find((tile) => tile.letter === "R");
    expect(secondTile).toBeDefined();
    const secondPlacement = placeTile(firstPlacement.state, secondTile?.id ?? "", CENTER, CENTER + 2);
    expect(secondPlacement.ok).toBe(true);

    expect(validateTurn(secondPlacement.state.board)).toEqual({
      ok: false,
      reason: "Le mot doit être continu, sans case vide entre les lettres."
    });
  });

  it("accepte le mot de démonstration SEREIN et ajoute le score", () => {
    const state = placeOpeningWord();
    const validated = validateHumanTurn(state);

    expect(validated.scores.human).toBeGreaterThan(0);
    expect(validated.board[CENTER][CENTER].tile?.committed).toBe(true);
    expect(validated.turn.player).toBe("computer");
  });

  it("fait poser un mot réel à l'ordinateur sur le plateau", () => {
    const humanTurn = validateHumanTurn(placeOpeningWord());
    const computerTurn = playEasyComputerTurn(humanTurn);
    const computerTiles = computerTurn.board
      .flatMap((row) => row)
      .filter((cell) => cell.tile?.owner === "computer");

    expect(computerTiles.length).toBeGreaterThan(0);
    expect(computerTiles.every((cell) => cell.tile?.committed)).toBe(true);
    expect(computerTurn.scores.computer).toBeGreaterThan(0);
    expect(computerTurn.turn.player).toBe("human");
  });

  it("accepte un mot préparé qui traverse une lettre déjà posée", () => {
    const humanTurn = validateHumanTurn(placeOpeningWord());
    const state = {
      ...humanTurn,
      racks: {
        ...humanTurn.racks,
        human: [
          { id: "A-cross", letter: "A", value: 1 },
          { id: "I-cross", letter: "I", value: 1 },
          { id: "R-cross", letter: "R", value: 2 }
        ]
      },
      turn: {
        player: "human" as const,
        placedTileIds: []
      }
    };

    const result = placeWord(
      state,
      ["A-cross", "I-cross", "R-cross"],
      CENTER - 1,
      CENTER + 4,
      "col"
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.board[CENTER][CENTER + 4].tile?.letter).toBe("I");
      expect(result.state.board[CENTER - 1][CENTER + 4].tile?.letter).toBe("A");
      expect(result.state.board[CENTER + 1][CENTER + 4].tile?.letter).toBe("R");
      expect(validateTurn(result.state.board)).toMatchObject({ ok: true, word: "AIR" });
      expect(result.state.racks.human.map((tile) => tile.id)).toEqual(["I-cross"]);
    }
  });

  it("utilise une lettre du plateau comme repère dans le mot préparé", () => {
    const humanTurn = validateHumanTurn(placeOpeningWord());
    const state = {
      ...humanTurn,
      racks: {
        ...humanTurn.racks,
        human: [
          { id: "A-board-cross", letter: "A", value: 1 },
          { id: "R-board-cross", letter: "R", value: 2 }
        ]
      },
      turn: {
        player: "human" as const,
        placedTileIds: []
      }
    };

    const result = placeWord(
      state,
      ["A-board-cross", createBoardTileToken(CENTER, CENTER + 4), "R-board-cross"],
      CENTER - 1,
      CENTER + 4,
      "col"
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.racks.human).toHaveLength(0);
      expect(validateTurn(result.state.board)).toMatchObject({ ok: true, word: "AIR" });
    }
  });

  it("détecte et accepte un mot croisé secondaire", () => {
    const board = createBoard();
    board[CENTER - 1][CENTER].tile = createPlacedTile("O-fixed", "O", CENTER - 1, CENTER, true);
    board[CENTER][CENTER - 1].tile = createPlacedTile("A-new", "A", CENTER, CENTER - 1, false);
    board[CENTER][CENTER].tile = createPlacedTile("R-new", "R", CENTER, CENTER, false);
    board[CENTER][CENTER + 1].tile = createPlacedTile("T-new", "T", CENTER, CENTER + 1, false);

    const validation = validateTurn(board);

    expect(validation).toMatchObject({ ok: true, word: "ART" });
    if (validation.ok) {
      expect(validation.words.map((word) => word.word)).toEqual(["ART", "OR"]);
    }
  });

  it("accepte un mot courant dont la catégorie Lexique contient une sous-catégorie", () => {
    const board = createBoard();
    board[CENTER][CENTER - 1].tile = createPlacedTile("M-new", "M", CENTER, CENTER - 1, false);
    board[CENTER][CENTER].tile = createPlacedTile("O-new", "O", CENTER, CENTER, false);
    board[CENTER][CENTER + 1].tile = createPlacedTile("N-new", "N", CENTER, CENTER + 1, false);

    expect(validateTurn(board)).toMatchObject({ ok: true, word: "MON" });
  });

  it("accepte une seule lettre nouvelle qui forme un mot vertical avec le plateau", () => {
    const board = createBoard();
    board[CENTER][CENTER].tile = createPlacedTile("R-fixed", "R", CENTER, CENTER, true);
    board[CENTER - 1][CENTER].tile = createPlacedTile("O-new", "O", CENTER - 1, CENTER, false);

    expect(validateTurn(board)).toMatchObject({ ok: true, word: "OR" });
  });

  it("refuse un mot croisé secondaire non reconnu", () => {
    const board = createBoard();
    board[CENTER - 1][CENTER].tile = createPlacedTile("Q-fixed", "Q", CENTER - 1, CENTER, true);
    board[CENTER][CENTER].tile = createPlacedTile("A-new", "A", CENTER, CENTER, false);
    board[CENTER][CENTER + 1].tile = createPlacedTile("R-new", "R", CENTER, CENTER + 1, false);
    board[CENTER][CENTER + 2].tile = createPlacedTile("T-new", "T", CENTER, CENTER + 2, false);

    expect(validateTurn(board)).toEqual({
      ok: false,
      reason: `Le mot "QA" n'est pas reconnu dans le dictionnaire actuel.`
    });
  });

  it("additionne le score du mot principal et des mots croisés", () => {
    const board = createBoard();
    const placedTiles = [
      createPlacedTile("A-new", "A", CENTER, CENTER - 1, false),
      createPlacedTile("R-new", "R", CENTER, CENTER, false),
      createPlacedTile("T-new", "T", CENTER, CENTER + 1, false)
    ];
    board[CENTER - 1][CENTER].tile = createPlacedTile("O-fixed", "O", CENTER - 1, CENTER, true);
    for (const tile of placedTiles) {
      board[tile.row][tile.col].tile = tile;
    }

    const validation = validateTurn(board);

    expect(validation.ok).toBe(true);
    if (validation.ok) {
      expect(scoreTurnWords(board, validation.words, placedTiles)).toBe(10);
      expect(explainTurnScore(board, validation.words, placedTiles)).toMatchObject({
        total: 10,
        fullRackBonus: 0,
        words: [
          { word: "ART", subtotal: 6 },
          { word: "OR", subtotal: 4 }
        ]
      });
    }
  });

  it("applique les bonus lettre triplée et mot triplé", () => {
    const board = createBoard();
    const placedTiles = [
      createPlacedTile("A-triple-letter", "A", 1, 1, false),
      createPlacedTile("R-plain", "R", 1, 2, false),
      createPlacedTile("T-plain", "T", 1, 3, false)
    ];

    for (const tile of placedTiles) {
      board[tile.row][tile.col].tile = tile;
    }

    const wordScore = explainTurnScore(
      board,
      [
        {
          word: "ART",
          direction: "row",
          cells: [board[1][1], board[1][2], board[1][3]]
        }
      ],
      placedTiles
    );

    expect(wordScore).toMatchObject({
      total: 7,
      words: [
        {
          word: "ART",
          subtotal: 7,
          wordMultiplier: 1,
          letters: [
            { letter: "A", points: 3, note: "lettre triplée" },
            { letter: "R", points: 2, note: "valeur simple" },
            { letter: "T", points: 2, note: "valeur simple" }
          ]
        }
      ]
    });

    const tripleWordTile = createPlacedTile("A-triple-word", "A", 0, 0, false);
    board[0][0].tile = tripleWordTile;

    const tripleWordScore = explainTurnScore(
      board,
      [
        {
          word: "A",
          direction: "row",
          cells: [board[0][0]]
        }
      ],
      [tripleWordTile]
    );

    expect(tripleWordScore).toMatchObject({
      total: 3,
      words: [{ word: "A", subtotal: 3, wordMultiplier: 3 }]
    });
  });

  it("propose un meilleur mot jouable au démarrage", () => {
    const hint = findBestHumanMove(createTestGame());

    expect(hint).not.toBeNull();
    expect(hint?.score).toBeGreaterThan(0);
    expect(hint?.scoreDetails.total).toBe(hint?.score);
    expect(hint?.word).toMatch(/^[A-Z]{2,13}$/);
    if (hint?.direction === "row") {
      expect(hint.row).toBe(CENTER);
      expect(hint.col).toBeLessThanOrEqual(CENTER);
      expect(hint.col + hint.word.length).toBeGreaterThan(CENTER);
    } else {
      expect(hint?.col).toBe(CENTER);
      expect(hint?.row).toBeLessThanOrEqual(CENTER);
      expect((hint?.row ?? 0) + (hint?.word.length ?? 0)).toBeGreaterThan(CENTER);
    }
  }, 15_000);

  it("propose un mot connecté après le premier coup", () => {
    const state = validateHumanTurn(placeOpeningWord());
    const hint = findBestHumanMove(state);

    expect(hint).not.toBeNull();
    expect(hint?.score).toBeGreaterThan(0);
  }, 15_000);

  it("propose aussi un mot long qui réutilise plusieurs lettres du plateau", () => {
    const board = createBoard();
    board[CENTER][CENTER].tile = createPlacedTile("V-fixed", "V", CENTER, CENTER, true);
    board[CENTER][CENTER + 1].tile = createPlacedTile("A-fixed", "A", CENTER, CENTER + 1, true);
    const state = {
      ...createTestGame(),
      board,
      racks: {
        ...createTestGame().racks,
        human: ["R", "A", "G", "E", "A", "I", "S", "N"].map((letter, index) => ({
          id: `${letter}-${index}`,
          letter,
          value: getTileValue(letter)
        }))
      }
    };
    const hint = findBestHumanMove(state);

    expect(hint).not.toBeNull();
    expect(hint?.word).toHaveLength(9);
  }, 15_000);

  it("prépare les tuiles nécessaires puis valide l'indice affiché", () => {
    const state = createTestGame();
    const hint = findBestHumanMove(state);
    expect(hint).not.toBeNull();

    const validated = validatePreparedHint(state, hint!);
    expect(hint?.tileIds).toHaveLength(hint?.word.length ?? 0);
    expect(validated.scores.human).toBeGreaterThan(0);
    expect(validated.turn.player).toBe("computer");
  }, 15_000);
});

function createPlacedTile(
  id: string,
  letter: string,
  row: number,
  col: number,
  committed: boolean
): PlacedTile {
  return {
    id,
    letter,
    value: getTileValue(letter),
    row,
    col,
    owner: committed ? "computer" : "human",
    committed
  };
}

function getTileValue(letter: string): number {
  const values: Record<string, number> = {
    A: 1,
    O: 1,
    R: 2,
    S: 2,
    T: 2
  };

  return values[letter] ?? 1;
}

function countBonus(board: ReturnType<typeof createBoard>, bonus: string): number {
  return board.flatMap((row) => row).filter((cell) => cell.bonus === bonus).length;
}

function countSpecialBonus(board: ReturnType<typeof createBoard>): number {
  return board.flatMap((row) => row).filter((cell) => cell.bonus !== "plain").length;
}
