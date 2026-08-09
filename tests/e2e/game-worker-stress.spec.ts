import { expect, test } from "@playwright/test";
import { clickTopbarButton, collectBrowserErrors, installSeededRandom, startNewGame, waitForAppReady } from "./helpers";

test("enchaîne indices et coups ordinateur sans erreur navigateur", async ({ page }) => {
  test.setTimeout(60_000);
  const browserErrors = collectBrowserErrors(page);

  await installSeededRandom(page, 42);
  await page.goto("/");

  await waitForAppReady(page);
  await clickTopbarButton(page, "Options");
  await page.getByLabel("Mode dev").check();
  await page.getByRole("button", { name: "Retour" }).click();
  await startNewGame(page);
  await expect(page.getByRole("heading", { name: "Zone de préparation" })).toBeVisible();

  for (let turnIndex = 0; turnIndex < 4; turnIndex += 1) {
    const hintButton = page.getByRole("button", { name: "Indice" });
    await expect(hintButton).toBeEnabled({ timeout: 15_000 });
    await hintButton.click();

    await expect(page.getByRole("status").filter({ hasText: /^Indice 1\/6 :/ })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByLabel("Diagnostic de recherche")).toContainText("Indice", { timeout: 5_000 });

    await page.getByRole("button", { name: "Passer" }).click();

    await expect(page.getByText("Le robot réfléchit")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Le robot (pose|passe)/)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("À vous de jouer.")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByLabel("Diagnostic de recherche")).toContainText("Robot", { timeout: 5_000 });
  }

  expect(browserErrors()).toEqual([]);
});
