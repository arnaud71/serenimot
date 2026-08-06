import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  testIgnore: ["pwa-offline.spec.ts"],
  fullyParallel: true,
  timeout: 30_000,
  expect: {
    timeout: 5_000
  },
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry"
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] }
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] }
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 7"] }
    },
    {
      name: "mobile-safari",
      use: { ...devices["iPhone 15"] }
    },
    {
      name: "tablet-android",
      use: { ...devices["Galaxy Tab S9 landscape"] }
    },
    {
      name: "tablet-safari",
      use: { ...devices["iPad Pro 11 landscape"] }
    }
  ]
});
