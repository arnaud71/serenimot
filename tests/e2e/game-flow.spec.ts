import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import {
  findBestWordForRack,
  getAvailableRackLetters,
  getBagCount,
  getComputerScore,
  getHumanScore,
  getOccupiedCellCount,
  getScoreSummary,
  placeFirstWordAtCenterFromRack
} from "./game-test-utils";
import { collectBrowserErrors, installSeededRandom, startNewGame, waitForAppReady } from "./helpers";

test("joue un tour complet puis reprend la partie après rechargement", async ({ page }) => {
  test.setTimeout(45_000);
  const browserErrors = collectBrowserErrors(page);

  await installSeededRandom(page, 51);
  await page.goto("/");
  await startNewGame(page);

  const rackLetters = await getAvailableRackLetters(page);
  const word = findBestWordForRack(rackLetters);
  expect(word, `Aucun mot testable avec le chevalet ${rackLetters.join("")}`).not.toBeNull();

  await placeFirstWordAtCenterFromRack(page, word ?? "");

  await expect(page.getByRole("button", { name: "Valider" })).toBeEnabled();
  await page.getByRole("button", { name: "Valider" }).click();

  await expect(getHumanScore(page)).not.toHaveText("0");
  await expect(page.getByText("L'ordinateur réfléchit")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/L'ordinateur (pose|passe)/)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("À vous de jouer.")).toBeVisible({ timeout: 20_000 });

  const scoreBeforeReload = await getScoreSummary(page);
  const occupiedCellsBeforeReload = await getOccupiedCellCount(page);
  expect(occupiedCellsBeforeReload).toBeGreaterThanOrEqual((word ?? "").length);

  await waitForSavedGame(page, scoreBeforeReload);
  await page.reload();

  await waitForAppReady(page);
  await expect(page.getByRole("button", { name: "Continuer" })).toBeEnabled();
  await page.getByRole("button", { name: "Continuer" }).click();

  await expect(page.getByRole("heading", { name: "Zone de préparation" })).toBeVisible();
  await expect(getHumanScore(page)).toHaveText(scoreBeforeReload.human);
  await expect(getComputerScore(page)).toHaveText(scoreBeforeReload.computer);
  await expect(getBagCount(page)).toHaveText(scoreBeforeReload.bag);
  await expect.poll(() => getOccupiedCellCount(page)).toBeGreaterThanOrEqual(occupiedCellsBeforeReload);
  await expect(page.getByRole("button", { name: "Indice" })).toBeEnabled({ timeout: 15_000 });

  expect(browserErrors()).toEqual([]);
});

async function waitForSavedGame(page: Page, expectedScores: { human: string; computer: string; bag: string }) {
  await page.waitForFunction(
    ({ human, computer, bag }) =>
      new Promise((resolve) => {
        const request = indexedDB.open("serenimot", 1);

        request.onerror = () => resolve(false);
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction("saved-games", "readonly");
          const store = transaction.objectStore("saved-games");
          const getRequest = store.get("current");

          getRequest.onerror = () => {
            db.close();
            resolve(false);
          };
          getRequest.onsuccess = () => {
            const savedGame = getRequest.result;
            db.close();
            resolve(
              String(savedGame?.state?.scores?.human) === human &&
                String(savedGame?.state?.scores?.computer) === computer &&
                String(savedGame?.state?.bag?.length) === bag
            );
          };
        };
      }),
    expectedScores,
    { timeout: 10_000 }
  );
}
