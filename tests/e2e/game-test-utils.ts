import type { Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const dictionaryWords = readFileSync(join(process.cwd(), "public/static/dictionary/lexique4005.txt"), "utf8")
  .trim()
  .split(/\r?\n/)
  .filter((word) => word.length >= 3 && word.length <= 8)
  .sort((left, right) => right.length - left.length || left.localeCompare(right));

export async function getAvailableRackLetters(page: Page) {
  return page
    .getByRole("button", { name: /^Ajouter la lettre/ })
    .evaluateAll((buttons) =>
      buttons
        .map((button) => button.getAttribute("aria-label")?.match(/Ajouter la lettre ([A-Z])/u)?.[1])
        .filter((letter): letter is string => Boolean(letter))
    );
}

export async function addWordFromRack(page: Page, word: string) {
  for (const letter of word) {
    await page.getByRole("button", { name: new RegExp(`Ajouter la lettre ${letter}, valeur`) }).first().click();
  }
}

export async function placeFirstWordAtCenter(page: Page, word: string) {
  const boardSize = await getBoardSize(page);
  const center = Math.floor(boardSize / 2);
  const startCol = Math.max(0, Math.min(boardSize - word.length, center - Math.floor(word.length / 2)));

  await page
    .getByRole("gridcell", { name: new RegExp(`Ligne ${center + 1}, colonne ${startCol + 1}`) })
    .click();
}

export async function getBoardSize(page: Page) {
  return page.getByRole("grid").evaluate((grid) => Number(grid.getAttribute("aria-rowcount")));
}

export function getHumanScore(page: Page) {
  return page.locator(".topbar-score-panel > div").filter({ hasText: "Vous" }).locator("strong");
}

export function getComputerScore(page: Page) {
  return page.locator(".topbar-score-panel > div").filter({ hasText: "Ordinateur" }).locator("strong");
}

export function getBagCount(page: Page) {
  return page.locator(".topbar-score-panel > div").filter({ hasText: "Pioche" }).locator("strong");
}

export async function getScoreSummary(page: Page) {
  return {
    human: await getHumanScore(page).innerText(),
    computer: await getComputerScore(page).innerText(),
    bag: await getBagCount(page).innerText()
  };
}

export async function getOccupiedCellCount(page: Page) {
  return page.getByRole("gridcell").evaluateAll(
    (cells) => cells.filter((cell) => /lettre [A-Z]/u.test(cell.getAttribute("aria-label") ?? "")).length
  );
}

export function findBestWordForRack(rackLetters: string[]) {
  const rackCounts = countLetters(rackLetters);

  return dictionaryWords.find((word) => {
    const wordCounts = countLetters([...word]);
    return [...wordCounts].every(([letter, count]) => (rackCounts.get(letter) ?? 0) >= count);
  });
}

function countLetters(letters: string[]) {
  const counts = new Map<string, number>();

  for (const letter of letters) {
    counts.set(letter, (counts.get(letter) ?? 0) + 1);
  }

  return counts;
}
