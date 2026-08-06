import { expect, test } from "@playwright/test";
import { startNewGame } from "./helpers";

test("garde une disposition lisible en tablette paysage", async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  test.skip(!testInfo.project.name.startsWith("tablet-"), "Scénario réservé aux profils tablette.");

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await startNewGame(page);

  const viewport = page.viewportSize();
  expect(viewport, "Le profil tablette doit définir une taille de viewport.").not.toBeNull();

  const boardShell = page.locator(".board-shell");
  const gameSide = page.locator(".game-side");
  const preparationZone = page.locator(".preparation-zone");
  const mobileActionBar = page.locator(".mobile-action-bar");
  const mobileRecenterButton = page.locator(".mobile-recenter-board");

  await expect(boardShell).toBeVisible();
  await expect(gameSide).toBeVisible();
  await expect(preparationZone).toBeVisible();
  await expect(mobileActionBar).not.toBeVisible();
  await expect(mobileRecenterButton).not.toBeVisible();

  const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(horizontalOverflow).toBeLessThanOrEqual(2);

  const boardBox = await boardShell.boundingBox();
  const sideBox = await gameSide.boundingBox();
  const preparationBox = await preparationZone.boundingBox();
  expect(boardBox).not.toBeNull();
  expect(sideBox).not.toBeNull();
  expect(preparationBox).not.toBeNull();

  const safeViewport = viewport ?? { width: 0, height: 0 };
  expect(boardBox?.x ?? -1).toBeGreaterThanOrEqual(0);
  expect((sideBox?.x ?? 0) + (sideBox?.width ?? 0)).toBeLessThanOrEqual(safeViewport.width + 1);
  expect(boardBox?.x ?? 0).toBeLessThan(sideBox?.x ?? 0);
  expect(Math.abs((boardBox?.y ?? 0) - (sideBox?.y ?? 0))).toBeLessThanOrEqual(4);
  expect(boardBox?.height ?? safeViewport.height + 1).toBeLessThanOrEqual(safeViewport.height + 1);
  expect(preparationBox?.width ?? 0).toBeGreaterThan(260);

  await testInfo.attach("tablet-layout", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png"
  });
});
