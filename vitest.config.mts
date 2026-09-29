import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/support/setup.ts"],
    // Every test lives under tests/ (plan §139.16): unit/ mirrors src/, db/ and
    // contract/ hold what belongs to no one module. src/ holds only what ships.
    // The integration tests need the local database, and run on their own
    // (vitest.integration.config.mts); the browser journeys are Playwright's.
    include: ["tests/**/*.test.{ts,tsx}"],
    exclude: ["tests/db/integration/**", "tests/e2e/**", "**/node_modules/**"],
    alias: {
      "@tests": path.resolve(__dirname, "./tests"),
      "@": path.resolve(__dirname, "./src"),
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/app/**/layout.tsx"],
    },
  },
});
