// Builds the pages the Android app carries inside it, then syncs the Android
// project (plan §139.17; the user, 2026-09-28). Everything else the app shows
// comes from the hosted web app.
//
//   .capacitor/shell/index.html    Capacitor's required start page; the shell
//                                  opens the hosted app instead, so it is only
//                                  ever seen for a moment
//   .capacitor/shell/offline.html  shown when the hosted app cannot be reached
//                                  (server.errorPath) — no network, or the
//                                  server is down. Try again reopens the app.
//   .capacitor/shell/icon.webp     the app's icon, for those pages
//
// They are plain HTML in Golden's colours, with no script from the web app:
// Capacitor gives the error page no plugins, and it must work with nothing
// loaded. The words are the web app's own (UI_TEXT.offline).
//
//   npm run android:sync     # reads ANDROID_APP_URL from .env.local
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { UI_TEXT } from "../src/constants/messages.ts";
import { shellServer } from "../src/lib/native/shell.ts";

const OUT = ".capacitor/shell";
const ICON = "src/assets/brand/icon.webp";

const server = shellServer(process.env.ANDROID_APP_URL);
const text = UI_TEXT.offline;

const escape = (value) =>
  String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// Golden (src/app/globals.css): ground, ink, muted ink, the one dark control.
const page = (title, body) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#f6efe5">
<title>${escape(title)} · ${escape(UI_TEXT.appName)}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  html, body { margin: 0; height: 100%; background: #f6efe5; color: #2b1d14; }
  body {
    display: flex; min-height: 100dvh; align-items: center; justify-content: center; text-align: center;
    padding: max(3rem, env(safe-area-inset-top)) max(1.5rem, env(safe-area-inset-right))
      max(3rem, env(safe-area-inset-bottom)) max(1.5rem, env(safe-area-inset-left));
    font: 16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  }
  main { width: 100%; max-width: 24rem; display: flex; flex-direction: column; align-items: center; }
  img { width: 64px; height: 64px; margin-bottom: 1.5rem; }
  h1 { margin: 0; font: 500 1.875rem/1.2 Georgia, "Times New Roman", serif; letter-spacing: -0.01em; }
  p { margin: 0.75rem 0 0; color: #6b5747; }
  a {
    display: flex; align-items: center; justify-content: center; margin-top: 2rem; width: 100%; min-height: 48px;
    border-radius: 999px; background: #2a1b12; color: #fff8f0; font-weight: 600; text-decoration: none;
  }
  a:focus-visible { outline: 2px solid #2a1b12; outline-offset: 3px; }
</style>
</head>
<body>
<main>
${body}
</main>
</body>
</html>
`;

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.copyFileSync(ICON, path.join(OUT, "icon.webp"));
fs.writeFileSync(
  path.join(OUT, "offline.html"),
  page(
    text.title,
    `<img src="icon.webp" alt="">
<h1>${escape(text.title)}</h1>
<p>${escape(text.body)}</p>
<a href="${escape(server.url)}/">${escape(text.retry)}</a>`,
  ),
);
fs.writeFileSync(
  path.join(OUT, "index.html"),
  page(UI_TEXT.appName, `<img src="icon.webp" alt="${escape(UI_TEXT.appName)}">`),
);
console.log(`Built the Android shell's pages in ${OUT}, for ${server.url}.`);

if (process.argv.includes("--no-sync")) process.exit(0);
const sync = spawnSync("npx", ["cap", "sync", "android"], { stdio: "inherit", env: process.env });
process.exit(sync.status ?? 1);
