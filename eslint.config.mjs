import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Only the native layer talks to Capacitor (AGENTS §19): everything else
  // imports it from @/lib/native, so the web app and the Android app stay one.
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/lib/native/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@capacitor/*"],
              message: "Only src/lib/native talks to Capacitor: import what you need from @/lib/native.",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // The Android project and the pages synced into it are not the web app's source.
    "android/**",
    ".capacitor/**",
  ]),
]);

export default eslintConfig;
