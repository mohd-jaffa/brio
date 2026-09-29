import path from "node:path";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

/**
 * The integration tests (plan §121, §139.16; R6.6): the app's own data
 * functions against a real database — the local Supabase (`npm run db:start`)
 * with every migration applied. `npm run test:integration`.
 *
 * They make accounts and businesses of their own and delete them after, so
 * they may run against a database in use; but only a local one. A hosted
 * address is refused, and no mail is sent (SMTP is left unset: an account's
 * confirmation fails quietly, as it does when mail is down).
 */
const local = { ...loadEnv("test", process.cwd(), ""), ...process.env };
const supabaseUrl = local.NEXT_PUBLIC_SUPABASE_URL ?? "";
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(supabaseUrl)) {
  throw new Error(`Integration tests run only against a local Supabase, not ${supabaseUrl || "an unset address"}.`);
}

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/db/integration/**/*.test.ts"],
    env: {
      NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: local.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
      SUPABASE_SERVICE_ROLE_KEY: local.SUPABASE_SERVICE_ROLE_KEY ?? "",
      NEXT_PUBLIC_APP_URL: local.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      SMTP_HOST: "",
      SMTP_PORT: "",
      SMTP_USER: "",
      SMTP_PASSWORD: "",
      SMTP_FROM: "",
      SMTP_SECURE: "",
    },
    // Each file makes its own businesses; one at a time keeps them apart in the logs.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    alias: {
      "@tests": path.resolve(__dirname, "./tests"),
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
