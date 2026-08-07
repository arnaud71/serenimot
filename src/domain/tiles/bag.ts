import { BOARD_SIZE, BoardSize, Rack, Tile } from "./types";

export type LetterDistributionEntry = {
  letter: string;
  count: number;
  value: number;
};

export const LETTER_DISTRIBUTION: LetterDistributionEntry[] = [
  { letter: "A", count: 9, value: 1 },
  { letter: "E", count: 14, value: 1 },
  { letter: "I", count: 8, value: 1 },
  { letter: "O", count: 6, value: 1 },
  { letter: "U", count: 6, value: 1 },
  { letter: "L", count: 5, value: 2 },
  { letter: "M", count: 4, value: 2 },
  { letter: "N", count: 6, value: 2 },
  { letter: "R", count: 6, value: 2 },
  { letter: "S", count: 6, value: 2 },
  { letter: "T", count: 6, value: 2 },
  { letter: "C", count: 4, value: 3 },
  { letter: "D", count: 4, value: 3 },
  { letter: "P", count: 4, value: 3 },
  { letter: "B", count: 3, value: 4 },
  { letter: "F", count: 3, value: 4 },
  { letter: "G", count: 3, value: 4 },
  { letter: "H", count: 2, value: 5 },
  { letter: "J", count: 2, value: 6 },
  { letter: "Q", count: 2, value: 6 },
  { letter: "V", count: 2, value: 5 },
  { letter: "X", count: 1, value: 8 },
  { letter: "Y", count: 1, value: 8 },
  { letter: "Z", count: 1, value: 8 }
];

export function getLetterDistributionForBoardSize(boardSize: BoardSize = BOARD_SIZE): LetterDistributionEntry[] {
  if (boardSize === BOARD_SIZE) {
    return LETTER_DISTRIBUTION;
  }

  const targetTileCount = getTileCountForBoardSize(boardSize);
  const standardTileCount = getTileCountForDistribution(LETTER_DISTRIBUTION);
  const scale = targetTileCount / standardTileCount;
  const scaledDistribution = LETTER_DISTRIBUTION.map((entry) => {
    const exactCount = entry.count * scale;

    return {
      ...entry,
      count: Math.max(1, Math.floor(exactCount)),
      remainder: exactCount - Math.floor(exactCount)
    };
  });
  let currentTileCount = scaledDistribution.reduce((total, entry) => total + entry.count, 0);

  if (currentTileCount < targetTileCount) {
    const byRemainder = [...scaledDistribution].sort(
      (first, second) => second.remainder - first.remainder || second.count - first.count
    );

    for (let index = 0; currentTileCount < targetTileCount; index = (index + 1) % byRemainder.length) {
      byRemainder[index].count += 1;
      currentTileCount += 1;
    }
  }

  if (currentTileCount > targetTileCount) {
    const byCount = [...scaledDistribution].sort(
      (first, second) => first.remainder - second.remainder || second.count - first.count
    );

    for (let index = 0; currentTileCount > targetTileCount; index = (index + 1) % byCount.length) {
      if (byCount[index].count <= 1) {
        continue;
      }

      byCount[index].count -= 1;
      currentTileCount -= 1;
    }
  }

  return scaledDistribution.map(({ letter, count, value }) => ({ letter, count, value }));
}

export function getTileCountForBoardSize(boardSize: BoardSize = BOARD_SIZE): number {
  const standardTileCount = getTileCountForDistribution(LETTER_DISTRIBUTION);
  const boardRatio = (boardSize * boardSize) / (BOARD_SIZE * BOARD_SIZE);

  return Math.max(24, Math.round(standardTileCount * boardRatio));
}

export function getTileCountForDistribution(distribution: LetterDistributionEntry[] = LETTER_DISTRIBUTION): number {
  return distribution.reduce((total, entry) => total + entry.count, 0);
}

export function createBag(boardSize: BoardSize = BOARD_SIZE): Tile[] {
  const distribution = getLetterDistributionForBoardSize(boardSize);
  const values = new Map(LETTER_DISTRIBUTION.map(({ letter, value }) => [letter, value]));
  const tiles: Tile[] = [];
  const letterIndexes = new Map<string, number>();

  for (const { letter, count } of distribution) {
    for (let index = 0; index < count; index += 1) {
      tiles.push(createTile(letter, values, letterIndexes));
    }
  }

  return tiles;
}

export function createDemoBag(boardSize: BoardSize = BOARD_SIZE): Tile[] {
  const distribution = getLetterDistributionForBoardSize(boardSize);
  const remainingCounts = new Map(distribution.map(({ letter, count }) => [letter, count]));
  const values = new Map(LETTER_DISTRIBUTION.map(({ letter, value }) => [letter, value]));
  const openingLetters = ["S", "E", "R", "E", "I", "N", "M", "O"];
  const computerOpeningLetters = ["A", "M", "I", "E", "R", "T", "O", "L"];
  const tiles: Tile[] = [];
  const letterIndexes = new Map<string, number>();

  for (const letter of [...openingLetters, ...computerOpeningLetters]) {
    tiles.push(createTile(letter, values, letterIndexes));
    remainingCounts.set(letter, Math.max(0, (remainingCounts.get(letter) ?? 0) - 1));
  }

  for (const [letter, count] of remainingCounts) {
    for (let index = 0; index < count; index += 1) {
      tiles.push(createTile(letter, values, letterIndexes));
    }
  }

  return tiles;
}

export function shuffleTiles(tiles: Tile[], random: () => number = Math.random): Tile[] {
  const shuffledTiles = [...tiles];

  for (let index = shuffledTiles.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffledTiles[index], shuffledTiles[swapIndex]] = [shuffledTiles[swapIndex], shuffledTiles[index]];
  }

  return shuffledTiles;
}

export function drawTiles(bag: Tile[], count: number): { drawn: Rack; bag: Tile[] } {
  return {
    drawn: bag.slice(0, count),
    bag: bag.slice(count)
  };
}

export function refillRack(rack: Rack, bag: Tile[], rackSize: number): { rack: Rack; bag: Tile[] } {
  const missing = Math.max(0, rackSize - rack.length);
  const { drawn, bag: remainingBag } = drawTiles(bag, missing);

  return {
    rack: [...rack, ...drawn],
    bag: remainingBag
  };
}

function createTile(
  letter: string,
  values: Map<string, number>,
  letterIndexes: Map<string, number>
): Tile {
  const nextIndex = (letterIndexes.get(letter) ?? 0) + 1;
  letterIndexes.set(letter, nextIndex);

  return {
    id: `${letter}-${nextIndex}`,
    letter,
    value: values.get(letter) ?? 1
  };
}
