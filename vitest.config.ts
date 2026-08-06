import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: ["**/node_modules/**", "**/dist/**", "tests/e2e/**"],
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts"
  }
});
