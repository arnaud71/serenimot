import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { installSeededRandom, startNewGame } from "./helpers";

const dictionaryWords = readFileSync(join(process.cwd(), "public/static/dictionary/lexique4005.txt"), "utf8")
  .trim()
  .split(/\r?\n/)
  .filter((word) => word.length >= 3 && word.length <= 8)
  .sort((left, right) => right.length - left.length || left.localeCompare(right));

test("défait une action de préparation", async ({ page }) => {
  await startSeededGame(page, 40);

  await expect(page.getByRole("button", { name: "Défaire" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Refaire" })).toBeDisabled();
  const [firstLetter] = await getAvailableRackLetters(page);
  expect(firstLetter).toBeTruthy();

  await page.getByRole("button", { name: new RegExp(`Ajouter la lettre ${firstLetter}, valeur`) }).first().click();
  await expect(page.getByLabel(`Chevalet ${firstLetter}`)).toBeVisible();
  await expect(page.getByRole("button", { name: "Défaire" })).toBeEnabled();

  await page.getByRole("button", { name: "Défaire" }).click();

  await expect(page.getByLabel("Chevalet vide")).toBeVisible();
  await expect(page.getByRole("button", { name: "Défaire" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Refaire" })).toBeEnabled();

  await page.getByRole("button", { name: "Refaire" }).click();

  await expect(page.getByLabel(`Chevalet ${firstLetter}`)).toBeVisible();
  await expect(page.getByRole("button", { name: "Défaire" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Refaire" })).toBeDisabled();
});

test("prépare, retire une pièce par clic et efface les lettres du chevalet", async ({ page }) => {
  await startSeededGame(page, 41);

  const rackLetters = await getAvailableRackLetters(page);
  const word = findBestWordForRack(rackLetters);
  expect(word, `Aucun mot testable avec le chevalet ${rackLetters.join("")}`).not.toBeNull();

  const selectedWord = word ?? "";
  await addWordToPreparedRack(page, selectedWord);
  await expect(page.getByLabel(`Chevalet ${selectedWord}`)).toBeVisible();
  await expect(getBuilderAction(page, "Reprendre")).toBeDisabled();
  await expect(getBuilderAction(page, "Effacer")).toBeEnabled();

  await page.getByRole("button", { name: /^Retirer la lettre/u }).last().click();
  await expect(page.getByLabel(`Chevalet ${selectedWord.slice(0, -1)}`)).toBeVisible();

  await getBuilderAction(page, "Effacer").click();
  await expect(page.getByLabel("Chevalet vide")).toBeVisible();
  await expect(getBuilderAction(page, "Reprendre")).toBeDisabled();
  await expect(getBuilderAction(page, "Effacer")).toBeDisabled();
});

test("ajoute par clic à droite de la dernière lettre du chevalet", async ({ page }) => {
  await startSeededGame(page, 47);

  const rackLetters = await getAvailableRackLetters(page);
  expect(rackLetters.length).toBeGreaterThanOrEqual(4);
  const [firstLetter, secondLetter, thirdLetter, fourthLetter] = rackLetters;

  await addWordToPreparedRack(page, `${firstLetter}${secondLetter}${thirdLetter}`);
  await page
    .locator(".prepared-word")
    .getByRole("button", { name: new RegExp(`Retirer la lettre ${secondLetter} du chevalet`, "u") })
    .first()
    .click();
  await page.getByRole("button", { name: new RegExp(`Ajouter la lettre ${fourthLetter}, valeur`, "u") }).first().click();

  await expect.poll(async () => (await getPreparedSlotLabels(page)).slice(0, 4)).toEqual([
    expect.stringContaining(`Retirer la lettre ${firstLetter}`),
    "Emplacement vide 2",
    expect.stringContaining(`Retirer la lettre ${thirdLetter}`),
    expect.stringContaining(`Retirer la lettre ${fourthLetter}`)
  ]);
});

test("pose un mot préparé puis permet de le reprendre sans vider le chevalet", async ({ page }) => {
  await startSeededGame(page, 42);

  const rackLetters = await getAvailableRackLetters(page);
  const word = findBestWordForRack(rackLetters);
  expect(word, `Aucun mot testable avec le chevalet ${rackLetters.join("")}`).not.toBeNull();

  const selectedWord = word ?? "";
  await addWordToPreparedRack(page, selectedWord);
  await placePreparedWordOnCenter(page, selectedWord);

  await expect(page.getByText("Le premier mot doit passer par la case centrale.")).toBeHidden();
  await expect(getBuilderAction(page, "Valider")).toBeEnabled();
  await expect(getBuilderAction(page, "Reprendre")).toBeEnabled();
  await expect(getBuilderAction(page, "Reprendre")).toHaveAttribute(
    "aria-description",
    "Reprend du plateau les lettres posées ce tour. Le chevalet reste en place ; les lettres déjà présentes sur le plateau en sont retirées."
  );
  for (const letter of selectedWord) {
    await expect(page.getByRole("gridcell", { name: new RegExp(`lettre ${letter}`) }).first()).toBeVisible();
  }

  await getBuilderAction(page, "Reprendre").click();

  await expect(page.getByLabel(`Chevalet ${selectedWord}`)).toBeVisible();
  await expect(getBuilderAction(page, "Valider")).toBeDisabled();
  await expect(getBuilderAction(page, "Reprendre")).toBeDisabled();
  await expect(getBoardTileCells(page)).toHaveCount(0);
});

test("efface un mot posé et remet les lettres dans vos lettres", async ({ page }) => {
  await startSeededGame(page, 43);

  const rackLetters = await getAvailableRackLetters(page);
  const word = findBestWordForRack(rackLetters);
  expect(word, `Aucun mot testable avec le chevalet ${rackLetters.join("")}`).not.toBeNull();

  const selectedWord = word ?? "";
  await addWordToPreparedRack(page, selectedWord);
  await placePreparedWordOnCenter(page, selectedWord);
  await expect(getBuilderAction(page, "Effacer")).toBeEnabled();

  await getBuilderAction(page, "Effacer").click();

  await expect(page.getByLabel("Chevalet vide")).toBeVisible();
  await expect(getBuilderAction(page, "Effacer")).toBeDisabled();
  for (const letter of selectedWord) {
    await expect(page.getByRole("button", { name: new RegExp(`Ajouter la lettre ${letter}, valeur`) }).first()).toBeVisible();
  }
  await expect(getBoardTileCells(page)).toHaveCount(0);
});

test("retire une seule lettre d'un mot posé par clic", async ({ page }) => {
  await startSeededGame(page, 44);

  const rackLetters = await getAvailableRackLetters(page);
  const word = findBestWordForRack(rackLetters);
  expect(word, `Aucun mot testable avec le chevalet ${rackLetters.join("")}`).not.toBeNull();

  const selectedWord = word ?? "";
  await addWordToPreparedRack(page, selectedWord);
  await placePreparedWordOnCenter(page, selectedWord);

  const boardSize = await getBoardSize(page);
  const center = Math.floor(boardSize / 2);
  const pivotIndex = Math.floor(selectedWord.length / 2);
  const startCol = Math.max(0, Math.min(boardSize - selectedWord.length, center - pivotIndex));
  const clickedCell = page.getByRole("gridcell", {
    name: new RegExp(`Ligne ${center + 1}, colonne ${center + 1}, lettre ${selectedWord[pivotIndex]}`)
  });

  await expect(page.getByRole("gridcell", { name: new RegExp(`Ligne ${center + 1}, colonne ${startCol + 1}, lettre`) })).toBeVisible();
  await clickedCell.click();

  await expect(clickedCell.locator(".board-tile-letter")).toHaveCount(0);
  await expect(getBoardTileCells(page)).toHaveCount(selectedWord.length - 1);
});

test("déplace une lettre déjà posée sur le plateau", async ({ page }) => {
  await startSeededGame(page, 46);

  const rackLetters = await getAvailableRackLetters(page);
  const word = findBestWordForRack(rackLetters);
  expect(word, `Aucun mot testable avec le chevalet ${rackLetters.join("")}`).not.toBeNull();

  const selectedWord = word ?? "";
  expect(selectedWord.length).toBeGreaterThan(2);
  await addWordToPreparedRack(page, selectedWord);
  await placePreparedWordOnCenter(page, selectedWord);

  const boardSize = await getBoardSize(page);
  const center = Math.floor(boardSize / 2);
  const startCol = Math.max(0, Math.min(boardSize - selectedWord.length, center - Math.floor(selectedWord.length / 2)));
  const targetRow = center + 1;
  const targetCol = startCol + 1;
  const sourceCell = page.getByRole("gridcell", {
    name: new RegExp(`^Ligne ${center + 1}, colonne ${startCol + 2}, lettre ${selectedWord[1]}`, "u")
  });
  const targetCell = page.getByRole("gridcell", {
    name: new RegExp(`^Ligne ${targetRow + 1}, colonne ${targetCol + 1},`, "u")
  });

  await sourceCell.dragTo(targetCell);

  await expect(sourceCell.locator(".board-tile-letter")).toHaveCount(0);
  await expect(
    page.getByRole("gridcell", {
      name: new RegExp(`^Ligne ${targetRow + 1}, colonne ${targetCol + 1}, lettre ${selectedWord[1]}`, "u")
    })
  ).toBeVisible();
});

test("défait et refait un état d'erreur visible", async ({ page }) => {
  await startSeededGame(page, 45);

  const rackLetters = await getAvailableRackLetters(page);
  const word = findBestWordForRack(rackLetters);
  expect(word, `Aucun mot testable avec le chevalet ${rackLetters.join("")}`).not.toBeNull();

  const selectedWord = word ?? "";
  await addWordToPreparedRack(page, selectedWord);
  await page.getByRole("gridcell", { name: /^Ligne 1, colonne 1,/u }).click();

  await expect(page.getByRole("gridcell", { name: /pose refusée/u }).first()).toBeVisible();

  await page.getByRole("button", { name: "Défaire" }).click();

  await expect(page.getByRole("gridcell", { name: /pose refusée/u })).toHaveCount(0);

  await page.getByRole("button", { name: "Refaire" }).click();

  await expect(page.getByRole("gridcell", { name: /pose refusée/u }).first()).toBeVisible();
});

async function startSeededGame(page: Page, seed: number) {
  await installSeededRandom(page, seed);
  await page.goto("/");
  await startNewGame(page);
  await expect(page.getByRole("heading", { name: "Zone de préparation" })).toBeVisible();
}

async function addWordToPreparedRack(page: Page, word: string) {
  for (const letter of word) {
    await page.getByRole("button", { name: new RegExp(`Ajouter la lettre ${letter}, valeur`) }).first().click();
  }
}

async function placePreparedWordOnCenter(page: Page, word: string) {
  const boardSize = await getBoardSize(page);
  const center = Math.floor(boardSize / 2);
  const startCol = Math.max(0, Math.min(boardSize - word.length, center - Math.floor(word.length / 2)));

  await page
    .getByRole("gridcell", { name: new RegExp(`Ligne ${center + 1}, colonne ${startCol + 1}`) })
    .click();
}

function getBuilderAction(page: Page, label: string) {
  return page.getByRole("button", { name: new RegExp(`^${label}`) });
}

function getBoardTileCells(page: Page) {
  return page.getByRole("gridcell", { name: /, lettre [A-Z]/u });
}

async function getBoardSize(page: Page) {
  return page.getByRole("grid").evaluate((grid) => Number(grid.getAttribute("aria-rowcount")));
}

async function getAvailableRackLetters(page: Page) {
  return page
    .getByRole("button", { name: /^Ajouter la lettre/ })
    .evaluateAll((buttons) =>
      buttons
        .map((button) => button.getAttribute("aria-label")?.match(/Ajouter la lettre ([A-Z])/u)?.[1])
        .filter((letter): letter is string => Boolean(letter))
    );
}

async function getPreparedSlotLabels(page: Page) {
  return page.locator(".prepared-word > button").evaluateAll((buttons) =>
    buttons.map((button) => button.getAttribute("aria-label") ?? "")
  );
}

function findBestWordForRack(rackLetters: string[]) {
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
