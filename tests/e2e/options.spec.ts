import { expect, test } from "@playwright/test";
import { clickTopbarButton, openTopbarMenuIfCollapsed, installSeededRandom, startNewGame, waitForAppReady } from "./helpers";

test("confirme avant de changer la taille de grille pendant une partie", async ({ page }) => {
  await installSeededRandom(page, 31);
  await page.goto("/");

  await startNewGame(page);
  await expect(page.getByLabel("Scores")).toContainText("13x13");

  await clickTopbarButton(page, "Options");
  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("va lancer une nouvelle partie");
    await dialog.dismiss();
  });
  await page.getByLabel("Taille du plateau").selectOption("9");
  await page.getByRole("button", { name: "Retour" }).click();

  await expect(page.getByLabel("Scores")).toContainText("13x13");
  await expect(page.getByRole("grid")).toHaveAttribute("aria-rowcount", "13");

  await clickTopbarButton(page, "Options");
  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("9 × 9");
    await dialog.accept();
  });
  await page.getByLabel("Taille du plateau").selectOption("9");

  await expect(page.getByLabel("Scores")).toContainText("9x9");
  await expect(page.getByRole("grid")).toHaveAttribute("aria-rowcount", "9");
});

test("conserve les options entre les parties et après rechargement", async ({ page }) => {
  await installSeededRandom(page, 32);
  await page.goto("/");

  await waitForAppReady(page);
  await clickTopbarButton(page, "Options");
  await page.getByLabel("Niveau du robot").selectOption("expert");
  await page.getByLabel("Performance du robot").selectOption("quality");
  await page.getByLabel("Indice").selectOption("none");
  await page.getByLabel("Annuler / refaire").selectOption("all-actions");
  await page.getByLabel("Bulles d'aide").uncheck();
  await page.getByLabel("Sons").uncheck();
  await expect(page.getByLabel("Volume")).toHaveCount(0);
  await page.getByRole("button", { name: "Retour" }).click();

  await startNewGame(page);
  await expect(page.getByRole("button", { name: "Indice désactivé" })).toBeDisabled();

  page.once("dialog", async (dialog) => dialog.accept());
  await clickTopbarButton(page, "Nouvelle partie");
  await expect(page.getByRole("button", { name: "Indice désactivé" })).toBeDisabled();

  await page.reload();
  await waitForAppReady(page);
  await clickTopbarButton(page, "Options");
  await expect(page.getByLabel("Niveau du robot")).toHaveValue("expert");
  await expect(page.getByLabel("Performance du robot")).toHaveValue("quality");
  await expect(page.getByLabel("Indice")).toHaveValue("none");
  await expect(page.getByLabel("Annuler / refaire")).toHaveValue("all-actions");
  await expect(page.getByLabel("Bulles d'aide")).not.toBeChecked();
  await expect(page.getByLabel("Sons")).not.toBeChecked();
});

test("peut masquer les bulles de hints visuelles", async ({ page }) => {
  await page.goto("/");

  await waitForAppReady(page);
  await clickTopbarButton(page, "Options");
  const opponentLevelRow = page.locator("label.setting-row", { hasText: "Niveau du robot" });
  await expect(opponentLevelRow).toHaveAttribute("data-tooltip", /niveau de jeu/);
  await page.getByLabel("Bulles d'aide").uncheck();
  await expect(opponentLevelRow).not.toHaveAttribute("data-tooltip", /./);
  await page.getByRole("button", { name: "Retour" }).click();

  await startNewGame(page);
  await openTopbarMenuIfCollapsed(page);
  await expect(page.getByRole("button", { name: "Lexique" })).not.toHaveAttribute("data-tooltip", /./);
});

test("affiche les infobulles des actions sans les couper", async ({ page }) => {
  await installSeededRandom(page, 34);
  await page.goto("/");

  await startNewGame(page);
  const hintButtons = page.getByRole("button", { name: /Indice/ });
  const count = await hintButtons.count();
  let visibleHintButton = hintButtons.first();

  for (let index = 0; index < count; index += 1) {
    const candidate = hintButtons.nth(index);

    if (await candidate.isVisible()) {
      visibleHintButton = candidate;
      break;
    }
  }

  await expect(visibleHintButton).toHaveAttribute("data-tooltip", /meilleur mot trouvé/i);
  await visibleHintButton.focus();
  await page.waitForTimeout(650);

  const tooltipState = await visibleHintButton.evaluate((button) => {
    const buttonStyle = window.getComputedStyle(button);
    const tooltipStyle = window.getComputedStyle(button, "::after");

    return {
      content: tooltipStyle.content,
      opacity: Number(tooltipStyle.opacity),
      overflow: buttonStyle.overflow
    };
  });

  expect(tooltipState.overflow).toBe("visible");
  expect(tooltipState.opacity).toBeGreaterThan(0.9);
  expect(tooltipState.content).not.toBe("none");
  expect(tooltipState.content).not.toBe('""');
});

test("conserve le volume sonore quand les sons sont activés", async ({ page }) => {
  await page.goto("/");

  await waitForAppReady(page);
  await clickTopbarButton(page, "Options");
  await expect(page.getByLabel("Volume")).toHaveValue("70");
  await page.getByLabel("Volume").fill("85");
  await expect(page.getByText("85%")).toBeVisible();

  await page.reload();
  await waitForAppReady(page);
  await clickTopbarButton(page, "Options");
  await expect(page.getByLabel("Volume")).toHaveValue("85");
});

test("affiche les diagnostics seulement quand le mode dev est activé", async ({ page }) => {
  await installSeededRandom(page, 33);
  await page.goto("/");

  await startNewGame(page);
  await expect(page.getByLabel("Diagnostic de recherche")).toBeHidden();

  await clickTopbarButton(page, "Options");
  await page.getByLabel("Mode dev").check();
  await page.getByRole("button", { name: "Retour" }).click();
  await page.getByRole("button", { name: "Indice" }).click();

  await expect(page.getByLabel("Diagnostic de recherche")).toContainText("Indice", { timeout: 15_000 });
});
