import { expect, test } from "@playwright/test";
import {
  addWordFromRack,
  findBestWordForRack,
  getAvailableRackLetters,
  getHumanScore,
  placeFirstWordAtCenter
} from "./game-test-utils";
import { installSeededRandom, startNewGame, waitForAppReady } from "./helpers";

test("charge l'application installable et joue un coup hors ligne", async ({ context, page }) => {
  await installSeededRandom(page, 41);
  await page.goto("/");
  await waitForAppReady(page);

  const manifestHref = await page.locator("link[rel='manifest']").getAttribute("href");
  expect(manifestHref).toBe("/manifest.webmanifest");
  await expect(page.locator("link[rel='apple-touch-icon']")).toHaveAttribute("href", "/icons/apple-touch-icon.png");

  const manifest = await page.evaluate(async () => {
    const response = await fetch("/manifest.webmanifest");
    return response.json() as Promise<{
      display: string;
      icons: { sizes: string; src: string; type: string }[];
      name: string;
      start_url: string;
      theme_color: string;
    }>;
  });
  expect(manifest).toMatchObject({
    display: "standalone",
    name: "Sérénimot",
    start_url: ".",
    theme_color: "#0f5f5c"
  });
  expect(manifest.icons).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ src: "icons/icon-192.png", sizes: "192x192", type: "image/png" }),
      expect.objectContaining({ src: "icons/icon-512.png", sizes: "512x512", type: "image/png" })
    ])
  );

  await page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) {
      throw new Error("Service worker indisponible.");
    }

    await navigator.serviceWorker.ready;
  });

  await page.reload();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), undefined, {
    timeout: 15_000
  });
  await waitForAppReady(page);

  try {
    await context.setOffline(true);
    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForAppReady(page);
    await startNewGame(page);

    await expect(page.getByRole("heading", { name: "Zone de préparation" })).toBeVisible();

    const rackLetters = await getAvailableRackLetters(page);
    const word = findBestWordForRack(rackLetters);
    expect(word, `Aucun mot testable avec le chevalet ${rackLetters.join("")}`).not.toBeNull();

    await addWordFromRack(page, word ?? "");
    await placeFirstWordAtCenter(page, word ?? "");

    await expect(page.getByRole("button", { name: "Valider" })).toBeEnabled();
    await page.getByRole("button", { name: "Valider" }).click();

    await expect(getHumanScore(page)).not.toHaveText("0");
    for (const letter of word ?? "") {
      await expect(page.getByRole("gridcell", { name: new RegExp(`lettre ${letter}`) }).first()).toBeVisible();
    }
  } finally {
    await context.setOffline(false);
  }
});
