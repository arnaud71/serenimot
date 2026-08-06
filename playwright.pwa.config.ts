import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: ["pwa-offline.spec.ts"],
  fullyParallel: false,
  timeout: 45_000,
  expect: {
    timeout: 8_000
  },
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:4174",
    trace: "on-first-retry"
  },
  webServer: {
    command: "npm run build && npm run preview -- --host 127.0.0.1 --port 4174",
    url: "http://127.0.0.1:4174",
    reuseExistingServer: false,
    timeout: 120_000
  },
  projects: [
    {
      name: "pwa-chromium",
      use: { ...devices["Desktop Chrome"] }
    },
    {
      name: "pwa-mobile-chrome",
      use: { ...devices["Pixel 7"] }
    },
    {
      name: "pwa-mobile-safari",
      use: { ...devices["iPhone 15"] }
    }
  ]
});
