import { expect, test } from "@playwright/test";
import { clickTopbarButton, collectBrowserErrors, installSeededRandom, startNewGame, waitForAppReady } from "./helpers";
import {
  addWordFromRack,
  findBestWordForRack,
  getAvailableRackLetters,
  getHumanScore,
  placeFirstWordAtCenter,
  placeFirstWordAtCenterFromRack
} from "./game-test-utils";

test("démarre une partie et vérifie les réglages principaux", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Sérénimot", exact: true })).toBeVisible();
  await startNewGame(page);

  await expect(page.getByRole("heading", { name: "Zone de préparation" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Chevalet" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Valider" })).toBeDisabled();
  await expect(page.getByLabel("Scores")).toContainText("Vous");
  await expect(page.getByLabel("Scores")).toContainText("Grille");

  await clickTopbarButton(page, "Options");

  await expect(page.getByRole("heading", { name: "Sérénimot" })).toBeVisible();
  await expect(page.getByLabel("Performance du robot")).toHaveValue("auto");
  await expect(page.getByLabel("Indice")).toBeVisible();
  await expect(page.getByLabel("Mode dev")).toBeVisible();
  await expect(page.getByLabel("Taille du plateau")).toBeVisible();

  await page.getByRole("button", { name: "Retour" }).click();
  await expect(page.getByRole("heading", { name: "Zone de préparation" })).toBeVisible();
  await expect(page.getByLabel("Diagnostic de recherche")).toBeHidden();
});

test("compose, pose et valide un premier mot", async ({ page }) => {
  await installSeededRandom(page, 1);
  await page.goto("/");

  await startNewGame(page);

  const rackLetters = await getAvailableRackLetters(page);
  const word = findBestWordForRack(rackLetters);
  expect(word, `Aucun mot testable avec le chevalet ${rackLetters.join("")}`).not.toBeNull();

  await placeFirstWordAtCenterFromRack(page, word ?? "");

  await expect(page.getByRole("button", { name: "Valider" })).toBeEnabled();
  await page.getByRole("button", { name: "Valider" }).click();

  await expect(getHumanScore(page)).not.toHaveText("0");
  for (const letter of word ?? "") {
    await expect(page.getByRole("gridcell", { name: new RegExp(`lettre ${letter}`) }).first()).toBeVisible();
  }
});

test("vide le chevalet quand le mot préparé est posé sur le plateau", async ({ page }) => {
  await installSeededRandom(page, 1);
  await page.goto("/");
  await startNewGame(page);

  const rackLetters = await getAvailableRackLetters(page);
  const word = findBestWordForRack(rackLetters);
  expect(word, `Aucun mot testable avec le chevalet ${rackLetters.join("")}`).not.toBeNull();

  const rackTileCount = await page.locator(".rack-tile").count();
  await addWordFromRack(page, word ?? "");

  await expect(page.locator(".prepared-word-tile")).toHaveCount(word?.length ?? 0);
  await expect(page.locator(".rack-tile")).toHaveCount(rackTileCount - (word?.length ?? 0));
  await expect(page.locator(".rack-slot-placeholder")).toHaveCount(word?.length ?? 0);

  await placeFirstWordAtCenter(page, word ?? "");

  await expect(page.getByLabel("Chevalet vide")).toBeVisible();
  await expect(page.locator(".prepared-word-tile")).toHaveCount(0);
  await expect(page.locator(".rack-tile")).toHaveCount(rackTileCount - (word?.length ?? 0));
  await expect(page.locator(".rack-slot-placeholder")).toHaveCount(word?.length ?? 0);
});

test("place une lettre dans un emplacement choisi du chevalet", async ({ page }) => {
  await installSeededRandom(page, 10);
  await page.goto("/");
  await startNewGame(page);

  const firstRackLetter = await page.locator(".rack-tile").first().locator("span").textContent();

  await page.locator(".prepared-word-slot[data-slot-index='2']").click();
  await expect(page.locator(".prepared-word-slot[data-slot-index='2']")).toHaveAttribute("aria-pressed", "true");

  await page.locator(".rack-tile").first().click();

  await expect(page.locator(".prepared-word-tile[data-slot-index='2'] span")).toHaveText(firstRackLetter ?? "");
  await expect(page.locator(".prepared-word-slot[data-slot-index='3']")).toBeVisible();
});

test("déplace une lettre du chevalet vers l'emplacement choisi", async ({ page }) => {
  await installSeededRandom(page, 16);
  await page.goto("/");
  await startNewGame(page);

  await page.locator(".rack-tile").first().click();
  await page.locator(".rack-tile").first().click();

  const firstPreparedLetter = await page.locator(".prepared-word-tile[data-slot-index='0'] span").textContent();
  const secondPreparedLetter = await page.locator(".prepared-word-tile[data-slot-index='1'] span").textContent();

  await page.locator(".prepared-word-slot[data-slot-index='3']").click();
  await expect(page.locator(".prepared-word-slot[data-slot-index='3']")).toHaveAttribute("aria-pressed", "true");

  await page.locator(".prepared-word-tile[data-slot-index='0']").click();

  await expect(page.locator(".prepared-word-slot[data-slot-index='0']")).toBeVisible();
  await expect(page.locator(".prepared-word-tile")).toHaveCount(2);
  await expect(page.locator(".prepared-word-tile[data-slot-index='1'] span")).toHaveText(secondPreparedLetter ?? "");
  await expect(page.locator(".prepared-word-tile[data-slot-index='3'] span")).toHaveText(firstPreparedLetter ?? "");
});

test("place une lettre sur une case choisie du plateau", async ({ page }) => {
  await installSeededRandom(page, 11);
  await page.goto("/");
  await startNewGame(page);

  const centerCell = page.locator(".board-cell[data-row='6'][data-col='6']");
  const firstRackLetter = await page.locator(".rack-tile").first().locator("span").textContent();

  await centerCell.click();
  await expect(centerCell).toHaveAttribute("aria-pressed", "true");

  await page.locator(".rack-tile").first().click();

  await expect(centerCell.locator(".board-tile-letter")).toHaveText(firstRackLetter ?? "");
  await expect(page.getByText("La lettre est posée. Vous pouvez valider ou modifier votre coup.")).toBeVisible();
});

test("retire seulement la lettre posée sur la case du plateau choisie", async ({ page }) => {
  await installSeededRandom(page, 12);
  await page.goto("/");
  await startNewGame(page);

  const preparedLetter = await page.locator(".rack-tile").first().locator("span").textContent();
  await page.locator(".rack-tile").first().click();
  await expect(page.locator(".prepared-word-tile")).toHaveCount(1);

  const centerCell = page.locator(".board-cell[data-row='6'][data-col='6']");
  const nextRackLetter = await page.locator(".rack-tile").first().locator("span").textContent();

  await centerCell.click();
  await expect(centerCell).toHaveAttribute("aria-pressed", "true");

  await page.locator(".rack-tile").first().click();

  await expect(centerCell.locator(".board-tile-letter")).toHaveText(nextRackLetter ?? "");
  await expect(page.locator(".prepared-word-tile")).toHaveCount(1);
  await expect(page.locator(".prepared-word-tile span")).toHaveText(preparedLetter ?? "");
});

test("cherche un indice sans bloquer l'interface", async ({ page }) => {
  const browserErrors = collectBrowserErrors(page);

  await installSeededRandom(page, 2);
  await page.goto("/");

  await startNewGame(page);

  await page.getByRole("button", { name: "Indice" }).click();

  await expect(page.getByText("Le robot cherche un indice possible.")).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: /^Valider pour jouer le mot trouvé/u })).toBeVisible({
    timeout: 15_000
  });
  await expect(page.getByRole("button", { name: "Indice" })).toBeVisible();
  expect(browserErrors()).toEqual([]);
});

test("désactive le bouton indice quand les indices sont coupés", async ({ page }) => {
  await installSeededRandom(page, 21);
  await page.goto("/");

  await waitForAppReady(page);
  await clickTopbarButton(page, "Options");
  await page.getByLabel("Indice").selectOption("none");
  await page.getByRole("button", { name: "Retour" }).click();
  await startNewGame(page);

  await expect(page.getByRole("button", { name: "Indice désactivé" })).toBeDisabled();
  await expect(page.getByText(/Indice \d\/6/)).toHaveCount(0);
});

test("affiche l'indice complet sans numérotation progressive", async ({ page }) => {
  const browserErrors = collectBrowserErrors(page);

  await installSeededRandom(page, 22);
  await page.goto("/");

  await waitForAppReady(page);
  await clickTopbarButton(page, "Options");
  await page.getByLabel("Indice").selectOption("complete");
  await page.getByRole("button", { name: "Retour" }).click();
  await startNewGame(page);

  await page.getByRole("button", { name: "Indice" }).click();

  const completeHintStatus = page.getByRole("status").filter({ hasText: /Valider pour jouer le mot trouvé : [A-Z]+/ });
  await expect(completeHintStatus).toBeVisible({ timeout: 15_000 });
  await expect(completeHintStatus).not.toContainText(/Indice \d\/6/);
  await expect(page.getByRole("button", { name: "Indice" })).toBeVisible();
  await expect(page.getByText(/Indice \d\/6/)).toHaveCount(0);

  await page.getByRole("button", { name: "Indice" }).click();

  await expect(page.getByText("L'indice a été retiré. À vous de jouer.")).toBeVisible();
  await expect(page.getByLabel("Chevalet vide")).toBeVisible();
  expect(browserErrors()).toEqual([]);
});

test("laisse le robot jouer sans crash après un tour passé", async ({ page }) => {
  const browserErrors = collectBrowserErrors(page);

  await installSeededRandom(page, 3);
  await page.goto("/");

  await startNewGame(page);
  await page.getByRole("button", { name: "Passer" }).click();

  await expect(page.getByText("Le robot réfléchit")).toBeVisible();
  await expect(page.getByText(/Le robot (pose|passe)/)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("À vous de jouer.")).toBeVisible();
  expect(browserErrors()).toEqual([]);
});
