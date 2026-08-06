import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import type { Board, GameState, Tile } from "../../src/domain/tiles/types";
import { getBagCount, getComputerScore, getHumanScore } from "./game-test-utils";
import { collectBrowserErrors, waitForAppReady } from "./helpers";

test("termine une partie sauvegardee avec une pioche vide", async ({ page }) => {
  const browserErrors = collectBrowserErrors(page);
  const almostFinishedGame = createAlmostFinishedGame();

  await resumeSavedGame(page, almostFinishedGame);
  await expect(getHumanScore(page)).toHaveText(String(almostFinishedGame.scores.human));
  await expect(getComputerScore(page)).toHaveText(String(almostFinishedGame.scores.computer));

  await page.getByRole("button", { name: "Passer" }).click();

  const gameOverDialog = page.getByRole("dialog");
  await expect(gameOverDialog).toBeVisible();
  await expect(gameOverDialog.getByRole("heading", { name: "Vous gagnez" })).toBeVisible();
  await expect(gameOverDialog).toContainText("La pioche est vide et un chevalet est terminé.");
  await expect(gameOverDialog).toContainText("Perdant : ordinateur");
  await expect(gameOverDialog).toContainText(String(almostFinishedGame.scores.human));
  await expect(gameOverDialog).toContainText(String(almostFinishedGame.scores.computer));

  expect(browserErrors()).toEqual([]);
});

test("relance une nouvelle partie depuis la fenetre de fin", async ({ page }) => {
  const browserErrors = collectBrowserErrors(page);
  const almostFinishedGame = createAlmostFinishedGame();

  await resumeSavedGame(page, almostFinishedGame);
  const gameOverDialog = await finishByEmptyBag(page);

  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("Voulez-vous commencer une nouvelle partie ?");
    await dialog.accept();
  });
  await gameOverDialog.getByRole("button", { name: "Nouvelle partie" }).click();

  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Zone de préparation" })).toBeVisible();
  await expect(getHumanScore(page)).toHaveText("0");
  await expect(getComputerScore(page)).toHaveText("0");
  await expect(getBagCount(page)).not.toHaveText("0");
  await expect(page.getByText("À vous de jouer.")).toBeVisible();

  expect(browserErrors()).toEqual([]);
});

test("termine une partie sauvegardee apres plusieurs tours passes", async ({ page }) => {
  const browserErrors = collectBrowserErrors(page);
  const almostFinishedGame = createAlmostPassedGame();

  await resumeSavedGame(page, almostFinishedGame);
  await expect(getHumanScore(page)).toHaveText(String(almostFinishedGame.scores.human));
  await expect(getComputerScore(page)).toHaveText(String(almostFinishedGame.scores.computer));

  await page.getByRole("button", { name: "Passer" }).click();

  const gameOverDialog = page.getByRole("dialog");
  await expect(gameOverDialog).toBeVisible();
  await expect(gameOverDialog.getByRole("heading", { name: "L'ordinateur gagne" })).toBeVisible();
  await expect(gameOverDialog).toContainText("Plus aucun joueur n'a posé de mot après plusieurs tours.");
  await expect(gameOverDialog).toContainText("Perdant : vous");
  await expect(gameOverDialog).toContainText(String(almostFinishedGame.scores.human));
  await expect(gameOverDialog).toContainText(String(almostFinishedGame.scores.computer));

  expect(browserErrors()).toEqual([]);
});

async function finishByEmptyBag(page: Page) {
  await page.getByRole("button", { name: "Passer" }).click();

  const gameOverDialog = page.getByRole("dialog");
  await expect(gameOverDialog).toBeVisible();
  await expect(gameOverDialog.getByRole("heading", { name: "Vous gagnez" })).toBeVisible();

  return gameOverDialog;
}

function createAlmostFinishedGame(): GameState {
  const computerRack = [createTile("ordinateur-1", "E", 1), createTile("ordinateur-2", "S", 2)];

  return {
    gameId: "e2e-fin-partie",
    board: createPlainBoard(13),
    bag: [],
    racks: {
      human: [],
      computer: computerRack
    },
    scores: {
      human: 48,
      computer: 31
    },
    turn: {
      player: "human",
      placedTileIds: []
    },
    passCount: 0,
    status: { state: "playing" },
    message: {
      tone: "info",
      text: "À vous de jouer."
    }
  };
}

function createAlmostPassedGame(): GameState {
  return {
    gameId: "e2e-fin-passes",
    board: createPlainBoard(13),
    bag: [createTile("pioche-1", "A", 1), createTile("pioche-2", "N", 2)],
    racks: {
      human: [createTile("humain-1", "E", 1), createTile("humain-2", "I", 1)],
      computer: [createTile("ordinateur-1", "O", 1), createTile("ordinateur-2", "R", 2)]
    },
    scores: {
      human: 22,
      computer: 35
    },
    turn: {
      player: "human",
      placedTileIds: []
    },
    passCount: 3,
    status: { state: "playing" },
    message: {
      tone: "info",
      text: "À vous de jouer."
    }
  };
}

function createPlainBoard(size: number): Board {
  return Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, col) => ({
      row,
      col,
      bonus: "plain",
      tile: null
    }))
  );
}

function createTile(id: string, letter: string, value: number): Tile {
  return { id, letter, value };
}

async function resumeSavedGame(page: Page, state: GameState) {
  await page.goto("/");
  await waitForAppReady(page);
  await saveCurrentGame(page, state);
  await page.reload();

  await waitForAppReady(page);
  await expect(page.getByRole("button", { name: "Continuer" })).toBeEnabled();
  await page.getByRole("button", { name: "Continuer" }).click();
  await expect(page.getByRole("heading", { name: "Zone de préparation" })).toBeVisible();
}

async function saveCurrentGame(page: Page, state: GameState) {
  await page.evaluate(async (gameState) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("serenimot", 1);

      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains("saved-games")) {
          database.createObjectStore("saved-games");
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("saved-games", "readwrite");
      const store = transaction.objectStore("saved-games");

      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };

      store.put(
        {
          schemaVersion: 1,
          savedAt: new Date().toISOString(),
          gameId: gameState.gameId,
          state: gameState
        },
        "current"
      );
    });
  }, state);
}
