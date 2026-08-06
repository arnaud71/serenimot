import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";

export async function waitForAppReady(page: Page) {
  await expect(page.getByRole("button", { name: "Nouvelle partie" })).toBeEnabled({ timeout: 20_000 });
}

export async function startNewGame(page: Page) {
  await waitForAppReady(page);
  await page.getByRole("button", { name: "Nouvelle partie" }).click();
}

export async function installSeededRandom(page: Page, seed: number) {
  await page.addInitScript((initialSeed) => {
    let state = initialSeed >>> 0;

    Math.random = () => {
      state = (state + 0x6d2b79f5) | 0;
      let value = Math.imul(state ^ (state >>> 15), 1 | state);
      value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }, seed);
}

export function collectBrowserErrors(page: Page) {
  const errors: string[] = [];
  const isDevServerWebSocketNoise = (text: string) =>
    text.includes("ws://127.0.0.1:4173") &&
    (text.includes("Socket is not connected") || text.includes("can’t establish a connection"));

  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") {
      const text = message.text();

      if (!isDevServerWebSocketNoise(text)) {
        errors.push(text);
      }
    }
  });

  return () => errors;
}
