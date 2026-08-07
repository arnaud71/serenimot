import type { Locator, Page } from "@playwright/test";
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

export async function placeFirstWordAtCenterFromRack(page: Page, word: string) {
  const boardSize = await getBoardSize(page);
  const center = Math.floor(boardSize / 2);
  const startCol = Math.max(0, Math.min(boardSize - word.length, center - Math.floor(word.length / 2)));

  for (const [index, letter] of [...word].entries()) {
    await page.locator(`.board-cell[data-row='${center}'][data-col='${startCol + index}']`).click();
    await page.getByRole("button", { name: new RegExp(`lettre ${letter}, valeur`) }).first().click();
  }
}

export async function touchDrag(page: Page, source: Locator, target: Locator) {
  const client = await page.context().newCDPSession(page);

  await source.scrollIntoViewIfNeeded();
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();

  if (!sourceBox || !targetBox) {
    throw new Error("Impossible de simuler le glissement tactile : cible introuvable.");
  }

  const startX = sourceBox.x + sourceBox.width / 2;
  const startY = sourceBox.y + sourceBox.height / 2;
  const endX = targetBox.x + targetBox.width / 2;
  const endY = targetBox.y + targetBox.height / 2;

  await client.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: startX, y: startY, id: 1 }]
  });

  for (let step = 1; step <= 8; step += 1) {
    await client.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        {
          x: startX + ((endX - startX) * step) / 8,
          y: startY + ((endY - startY) * step) / 8,
          id: 1
        }
      ]
    });
  }

  await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

export async function getBoardSize(page: Page) {
  return page.getByRole("grid").evaluate((grid) => Number(grid.getAttribute("aria-rowcount")));
}

export function getHumanScore(page: Page) {
  return page.locator(".game-status-panel > div").filter({ hasText: "Vous" }).locator("strong");
}

export function getComputerScore(page: Page) {
  return page.locator(".game-status-panel > div").filter({ hasText: /Robot|Ordinateur/u }).locator("strong");
}

export function getBagCount(page: Page) {
  return page.locator(".game-status-panel > div").filter({ hasText: "Pioche" }).locator("strong");
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
