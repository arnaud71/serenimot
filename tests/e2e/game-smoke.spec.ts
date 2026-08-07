import { expect, test } from "@playwright/test";
import type { Locator } from "@playwright/test";
import { collectBrowserErrors, installSeededRandom, startNewGame, waitForAppReady } from "./helpers";
import {
  addWordFromRack,
  findBestWordForRack,
  getAvailableRackLetters,
  getHumanScore,
  placeFirstWordAtCenter
} from "./game-test-utils";

test("démarre une partie et vérifie les réglages principaux", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Sérénimot" })).toBeVisible();
  await startNewGame(page);

  await expect(page.getByRole("heading", { name: "Zone de préparation" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Chevalet" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Valider" })).toBeDisabled();
  await expect(page.getByLabel("Scores")).toContainText("Vous");
  await expect(page.getByLabel("Scores")).toContainText("Grille");

  await page.getByRole("button", { name: "Options" }).click();

  await expect(page.getByRole("heading", { name: "Sérénimot" })).toBeVisible();
  await expect(page.getByLabel("Performance ordinateur")).toHaveValue("auto");
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

  await addWordFromRack(page, word ?? "");

  await expect(page.getByLabel("Chevalet vide")).not.toBeVisible();

  await placeFirstWordAtCenter(page, word ?? "");

  await expect(page.getByRole("button", { name: "Valider" })).toBeEnabled();
  await page.getByRole("button", { name: "Valider" }).click();

  await expect(getHumanScore(page)).not.toHaveText("0");
  for (const letter of word ?? "") {
    await expect(page.getByRole("gridcell", { name: new RegExp(`lettre ${letter}`) }).first()).toBeVisible();
  }
});

test("glisse des lettres dans le chevalet sur écran tactile", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "La simulation tactile fine utilise le protocole DevTools Chromium.");

  await installSeededRandom(page, 9);
  await page.goto("/");
  await startNewGame(page);

  const client = await page.context().newCDPSession(page);

  async function touchDrag(source: Locator, target: Locator) {
    await source.scrollIntoViewIfNeeded();
    const sourceBox = await source.boundingBox();
    const targetBox = await target.boundingBox();

    expect(sourceBox).not.toBeNull();
    expect(targetBox).not.toBeNull();

    const startX = sourceBox!.x + sourceBox!.width / 2;
    const startY = sourceBox!.y + sourceBox!.height / 2;
    const endX = targetBox!.x + targetBox!.width / 2;
    const endY = targetBox!.y + targetBox!.height / 2;

    await client.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: startX, y: startY, id: 1 }]
    });

    for (let step = 1; step <= 8; step += 1) {
      await client.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [
          {
            x: startX + ((endX - startX) * step) / 8,
            y: startY + ((endY - startY) * step) / 8,
            id: 1
          }
        ]
      });
    }

    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  }

  await touchDrag(page.locator(".rack-tile").first(), page.locator(".prepared-word-slot[data-slot-index='0']"));
  await touchDrag(page.locator(".rack-tile").first(), page.locator(".prepared-word-slot[data-slot-index='1']"));

  await expect(page.locator(".prepared-word-tile")).toHaveCount(2);
  const firstBefore = await page.locator(".prepared-word-tile[data-slot-index='0'] span").textContent();
  const secondBefore = await page.locator(".prepared-word-tile[data-slot-index='1'] span").textContent();

  await touchDrag(
    page.locator(".prepared-word-tile[data-slot-index='1']"),
    page.locator(".prepared-word-tile[data-slot-index='0']")
  );

  await expect(page.locator(".prepared-word-tile[data-slot-index='0'] span")).toHaveText(secondBefore ?? "");
  await expect(page.locator(".prepared-word-tile[data-slot-index='1'] span")).toHaveText(firstBefore ?? "");
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

test("cherche un indice sans bloquer l'interface", async ({ page }) => {
  const browserErrors = collectBrowserErrors(page);

  await installSeededRandom(page, 2);
  await page.goto("/");

  await startNewGame(page);

  await page.getByRole("button", { name: "Indice" }).click();

  await expect(page.getByText("L'ordinateur cherche un indice possible.")).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: /^Indice 1\/6 :/ })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: /Indice 1\/6/ })).toBeVisible();
  expect(browserErrors()).toEqual([]);
});

test("désactive le bouton indice quand les indices sont coupés", async ({ page }) => {
  await installSeededRandom(page, 21);
  await page.goto("/");

  await waitForAppReady(page);
  await page.getByRole("button", { name: "Options" }).click();
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
  await page.getByRole("button", { name: "Options" }).click();
  await page.getByLabel("Indice").selectOption("complete");
  await page.getByRole("button", { name: "Retour" }).click();
  await startNewGame(page);

  await page.getByRole("button", { name: "Indice" }).click();

  const completeHintStatus = page.getByRole("status").filter({ hasText: /Appuyez sur Valider pour le jouer\./ });
  await expect(completeHintStatus).toBeVisible({ timeout: 15_000 });
  await expect(completeHintStatus).not.toContainText(/Indice \d\/6/);
  await expect(page.getByRole("button", { name: "Indice" })).toBeVisible();
  await expect(page.getByText(/Indice \d\/6/)).toHaveCount(0);

  await page.getByRole("button", { name: "Indice" }).click();

  await expect(page.getByText("L'indice a été retiré. À vous de jouer.")).toBeVisible();
  await expect(page.getByLabel("Chevalet vide")).toBeVisible();
  expect(browserErrors()).toEqual([]);
});

test("laisse l'ordinateur jouer sans crash après un tour passé", async ({ page }) => {
  const browserErrors = collectBrowserErrors(page);

  await installSeededRandom(page, 3);
  await page.goto("/");

  await startNewGame(page);
  await page.getByRole("button", { name: "Passer" }).click();

  await expect(page.getByText("L'ordinateur réfléchit")).toBeVisible();
  await expect(page.getByText(/L'ordinateur (pose|passe)/)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("À vous de jouer.")).toBeVisible();
  expect(browserErrors()).toEqual([]);
});
