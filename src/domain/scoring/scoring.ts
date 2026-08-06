import type { TurnWord } from "../rules/validation";
import type { Board, BonusKind, PlacedTile, ScoreDetails, ScoreLetterDetail, ScoreWordDetail } from "../tiles/types";

export function scorePlacedTiles(board: Board, placedTiles: PlacedTile[]): number {
  if (placedTiles.length === 0) {
    return 0;
  }

  const letterScore = placedTiles.reduce((total, tile) => {
    const bonus = board[tile.row][tile.col].bonus;
    const multiplier = bonus === "letter3" ? 3 : bonus === "letter" ? 2 : 1;
    const calmBonus = bonus === "calm" ? 1 : 0;
    return total + tile.value * multiplier + calmBonus;
  }, 0);

  const wordMultiplier = placedTiles.reduce((multiplier, tile) => {
    const bonus = board[tile.row][tile.col].bonus;
    if (bonus === "word3") {
      return multiplier * 3;
    }

    if (bonus === "word") {
      return multiplier * 2;
    }

    return multiplier;
  }, 1);
  const fullRackBonus = placedTiles.length === 8 ? 12 : 0;

  return letterScore * wordMultiplier + fullRackBonus;
}

export function scoreTurnWords(board: Board, words: TurnWord[], placedTiles: PlacedTile[]): number {
  return explainTurnScore(board, words, placedTiles).total;
}

export function explainTurnScore(board: Board, words: TurnWord[], placedTiles: PlacedTile[]): ScoreDetails {
  if (words.length === 0 || placedTiles.length === 0) {
    return {
      words: [],
      fullRackBonus: 0,
      total: 0
    };
  }

  const placedTileIds = new Set(placedTiles.map((tile) => tile.id));
  const scoredWords = words.map((word) => explainWordScore(board, word, placedTileIds));
  const fullRackBonus = placedTiles.length === 8 ? 12 : 0;
  const total = scoredWords.reduce((sum, word) => sum + word.subtotal, 0) + fullRackBonus;

  return {
    words: scoredWords,
    fullRackBonus,
    total
  };
}

function explainWordScore(board: Board, word: TurnWord, placedTileIds: Set<string>): ScoreWordDetail {
  let wordMultiplier = 1;
  const letters = word.cells.reduce<ScoreLetterDetail[]>((details, cell) => {
    const tile = cell.tile;
    if (!tile) {
      return details;
    }

    if (!placedTileIds.has(tile.id)) {
      details.push({
        letter: tile.letter,
        value: tile.value,
        row: cell.row,
        col: cell.col,
        isNew: false,
        bonus: "plain",
        points: tile.value,
        note: "lettre déjà posée"
      });
      return details;
    }

    const { points, note } = scoreLetterWithBonus(tile.value, cell.bonus);

    if (cell.bonus === "word3") {
      wordMultiplier *= 3;
    }

    if (cell.bonus === "word") {
      wordMultiplier *= 2;
    }

    details.push({
      letter: tile.letter,
      value: tile.value,
      row: cell.row,
      col: cell.col,
      isNew: true,
      bonus: cell.bonus,
      points,
      note
    });

    return details;
  }, []);

  const letterScore = letters.reduce((sum, letter) => sum + letter.points, 0);

  return {
    word: word.word,
    subtotal: letterScore * wordMultiplier,
    wordMultiplier,
    letters
  };
}

function scoreLetterWithBonus(value: number, bonus: BonusKind): { points: number; note: string } {
  if (bonus === "letter") {
    return {
      points: value * 2,
      note: "lettre doublée"
    };
  }

  if (bonus === "letter3") {
    return {
      points: value * 3,
      note: "lettre triplée"
    };
  }

  if (bonus === "calm") {
    return {
      points: value + 1,
      note: "case Sérénité +1"
    };
  }

  if (bonus === "word") {
    return {
      points: value,
      note: "mot doublé"
    };
  }

  if (bonus === "word3") {
    return {
      points: value,
      note: "mot triplé"
    };
  }

  return {
    points: value,
    note: "valeur simple"
  };
}
