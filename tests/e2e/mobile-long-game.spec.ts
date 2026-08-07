import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import {
  findBestWordForRack,
  getAvailableRackLetters,
  getBagCount,
  getHumanScore,
  getOccupiedCellCount,
  placeFirstWordAtCenterFromRack
} from "./game-test-utils";
import { collectBrowserErrors, installSeededRandom, startNewGame } from "./helpers";

test("garde une partie mobile stable sur plusieurs tours", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  test.skip(!testInfo.project.name.startsWith("mobile-"), "Scénario réservé aux profils téléphone.");

  const browserErrors = collectBrowserErrors(page);

  await installSeededRandom(page, 137);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await startNewGame(page);

  const quickActions = page.getByLabel("Actions rapides");
  await expect(quickActions).toBeVisible();
  await expect(quickActions.getByRole("button", { name: "Valider" })).toBeVisible();
  await expect(quickActions.getByRole("button", { name: "Indice" })).toBeVisible();
  await expect(quickActions.getByRole("button", { name: "Passer" })).toBeVisible();

  const rackLetters = await getAvailableRackLetters(page);
  const word = findBestWordForRack(rackLetters);
  expect(word, `Aucun mot testable avec le chevalet ${rackLetters.join("")}`).not.toBeNull();

  await placeFirstWordAtCenterFromRack(page, word ?? "");
  await expect(quickActions.getByRole("button", { name: "Valider" })).toBeEnabled();
  await quickActions.getByRole("button", { name: "Valider" }).click();

  await expect(getHumanScore(page)).not.toHaveText("0");
  await expect.poll(() => getOccupiedCellCount(page)).toBeGreaterThanOrEqual((word ?? "").length);
  await waitForComputerThenHuman(page);

  const occupiedAfterFirstRound = await getOccupiedCellCount(page);
  const bagAfterFirstRound = Number(await getBagCount(page).innerText());

  await quickActions.getByRole("button", { name: /Indice/u }).click();
  await expect(quickActions.getByRole("button", { name: /Indice/u })).toBeVisible({ timeout: 10_000 });

  await quickActions.getByRole("button", { name: "Passer" }).click();
  await waitForComputerThenHuman(page);
  await quickActions.getByRole("button", { name: "Passer" }).click();
  await waitForComputerThenHuman(page);

  await expect.poll(() => getOccupiedCellCount(page)).toBeGreaterThanOrEqual(occupiedAfterFirstRound);
  await expect.poll(async () => Number(await getBagCount(page).innerText())).toBeLessThanOrEqual(bagAfterFirstRound);

  const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(horizontalOverflow).toBeLessThanOrEqual(2);
  expect(browserErrors()).toEqual([]);

  await testInfo.attach("mobile-long-game", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png"
  });
});

async function waitForComputerThenHuman(page: Page) {
  await expect(page.getByText("Le robot réfléchit")).toBeVisible({ timeout: 12_000 });
  await expect(page.getByText(/Le robot (pose|passe)/u)).toBeVisible({ timeout: 25_000 });
  await expect(page.getByText("À vous de jouer.")).toBeVisible({ timeout: 25_000 });
}
