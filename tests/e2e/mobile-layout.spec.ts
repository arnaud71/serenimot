import { expect, test } from "@playwright/test";
import { startNewGame } from "./helpers";

test("garde le plateau et la zone de préparation lisibles sur téléphone", async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  test.skip(!testInfo.project.name.startsWith("mobile-"), "Scénario réservé aux profils téléphone.");

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await startNewGame(page);

  const viewport = page.viewportSize();
  expect(viewport, "Le profil mobile doit définir une taille de viewport.").not.toBeNull();

  const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(horizontalOverflow).toBeLessThanOrEqual(2);

  const boardShell = page.locator(".board-shell");
  const preparationZone = page.locator(".preparation-zone");
  const scorePanel = page.getByLabel("Scores");
  const recenterButton = page.locator(".mobile-recenter-board");

  await expect(boardShell).toBeVisible();
  await expect(preparationZone).toBeVisible();
  await expect(scorePanel).toBeVisible();
  await expect(recenterButton).not.toBeVisible();

  const boardBox = await boardShell.boundingBox();
  const preparationBox = await preparationZone.boundingBox();
  expect(boardBox).not.toBeNull();
  expect(preparationBox).not.toBeNull();

  const safeViewport = viewport ?? { width: 0, height: 0 };
  expect(boardBox?.x ?? -1).toBeGreaterThanOrEqual(0);
  expect((boardBox?.x ?? 0) + (boardBox?.width ?? 0)).toBeLessThanOrEqual(safeViewport.width + 1);
  expect(boardBox?.y ?? safeViewport.height).toBeLessThan(safeViewport.height * 0.42);
  expect(preparationBox?.y ?? safeViewport.height).toBeLessThan(safeViewport.height);
  expect(preparationBox?.y ?? 0).toBeGreaterThan((boardBox?.y ?? 0) + (boardBox?.height ?? 0) - 1);

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(recenterButton).toBeVisible();
  await recenterButton.click();
  await expect
    .poll(async () => (await boardShell.boundingBox())?.y ?? safeViewport.height)
    .toBeLessThan(safeViewport.height * 0.35);
  await expect(recenterButton).not.toBeVisible();

  await testInfo.attach("mobile-layout", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png"
  });
});
