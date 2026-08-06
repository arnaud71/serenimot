import { expect, test } from "@playwright/test";
import {
  addWordFromRack,
  findBestWordForRack,
  getAvailableRackLetters,
  getHumanScore,
  getOccupiedCellCount,
  placeFirstWordAtCenter
} from "./game-test-utils";
import { collectBrowserErrors, installSeededRandom, startNewGame } from "./helpers";

test("joue un premier tour complet sur téléphone", async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  test.skip(!testInfo.project.name.startsWith("mobile-"), "Scénario réservé aux profils téléphone.");

  const browserErrors = collectBrowserErrors(page);

  await installSeededRandom(page, 71);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await startNewGame(page);

  const rackLetters = await getAvailableRackLetters(page);
  const word = findBestWordForRack(rackLetters);
  expect(word, `Aucun mot testable avec le chevalet ${rackLetters.join("")}`).not.toBeNull();

  await addWordFromRack(page, word ?? "");
  await expect(page.getByLabel("Chevalet vide")).not.toBeVisible();

  await placeFirstWordAtCenter(page, word ?? "");
  await expect(page.getByRole("button", { name: "Valider" })).toBeEnabled();
  await page.getByRole("button", { name: "Valider" }).click();

  await expect(getHumanScore(page)).not.toHaveText("0");
  await expect.poll(() => getOccupiedCellCount(page)).toBeGreaterThanOrEqual((word ?? "").length);
  await expect(page.getByText("L'ordinateur réfléchit")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/L'ordinateur (pose|passe)/)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("À vous de jouer.")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("button", { name: "Indice" })).toBeEnabled();

  const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(horizontalOverflow).toBeLessThanOrEqual(2);
  expect(browserErrors()).toEqual([]);

  await testInfo.attach("mobile-game-flow", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png"
  });
});
