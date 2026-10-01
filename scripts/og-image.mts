/**
 * The picture a shared link to Brio shows (the user, 2026-10-01: "add open
 * graph meta data for a better previews in social medias"): the brand's line
 * beside a phone open on a bill, drawn by the app itself — its fonts, its
 * colours and its phone frame (globals.css, `.device-phone`) — and saved as
 * the root segment's `opengraph-image.jpg` and `twitter-image.jpg`, with their
 * alt text. 1200 × 630, drawn at twice that and scaled down, kept small
 * enough for WhatsApp's previews.
 *
 *   npm run build && npx next start -p 3100          (in another terminal)
 *   npx tsx scripts/og-image.mts
 */
import { writeFile } from "node:fs/promises";

import { chromium } from "@playwright/test";
import sharp from "sharp";

import { UI_TEXT } from "@/constants/messages";

const APP = process.env.LANDING_APP_URL ?? "http://localhost:3100";
const OUT = "src/app";
const WIDTH = 1200;
const HEIGHT = 630;
// WhatsApp leaves a picture out of a preview past about 300 KB.
const MAX_BYTES = 300_000;

const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 2,
    reducedMotion: "reduce",
  });
  // tsx names the functions handed to the page with a helper the page lacks.
  await page.addInitScript("globalThis.__name = (fn) => fn;");
  await page.goto(`${APP}/`, { waitUntil: "networkidle" });

  // The landing page's own marks and screenshot, as the app serves them; the bill sharper than its hero draws it.
  const [wordmark, leaf, bill] = await page.evaluate(() => {
    const source = (selector: string) => {
      const image = document.querySelector<HTMLImageElement>(selector);
      if (!image) throw new Error(`Nothing at ${selector} on the landing page`);
      return image.currentSrc || image.src;
    };
    const wide = (address: string) => {
      const url = new URL(address);
      if (url.pathname === "/_next/image") url.searchParams.set("w", "828");
      return url.toString();
    };
    return [source("header img"), source(`img[src*="leaf"]`), wide(source(".landing-phone img"))];
  });

  await page.evaluate(
    ({ wordmark, leaf, bill, words }) => {
      const [madeBy, managed] = words.tagline.split(/(?<=\.)\s+/);
      document.body.innerHTML = `
        <div style="position:fixed;inset:0;overflow:hidden;background:var(--color-background);font-family:var(--font-body)">
          <div style="position:absolute;left:770px;top:84px;width:350px;height:470px;border-radius:44px;background:var(--color-sunken)"></div>
          <div class="device-phone" style="position:absolute;left:812px;top:36px;width:266px">
            <div class="device-phone-body">
              ${["action", "volume-up", "volume-down", "side", "camera"]
                .map((button) => `<span data-button="${button}" class="device-phone-button"></span>`)
                .join("")}
              <div class="device-phone-glass">
                <div class="device-phone-screen">
                  <img src="${bill}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover" />
                  <span class="device-phone-island"></span>
                </div>
              </div>
            </div>
          </div>
          <div style="position:absolute;left:84px;top:78px;width:660px">
            <img src="${wordmark}" alt="" style="display:block;height:58px;width:auto" />
            <h1 style="margin:92px 0 0;font-family:var(--font-display);font-size:76px;font-weight:600;line-height:1.02;letter-spacing:-0.035em;color:var(--color-text)">
              <span style="display:block">${madeBy}</span>
              <span style="display:block;color:var(--color-primary)">${managed}</span>
            </h1>
            <p style="margin:30px 0 0;font-size:26px;line-height:1.35;color:var(--color-text-muted);max-width:640px;text-wrap:balance">${words.line}</p>
            <p style="margin:54px 0 0;display:flex;align-items:center;gap:12px;font-size:19px;color:var(--color-text-muted)">
              <img src="${leaf}" alt="" style="height:20px;width:auto" />${words.audience}
            </p>
          </div>
        </div>`;
    },
    {
      wordmark,
      leaf,
      bill,
      words: { tagline: UI_TEXT.appTagline, line: UI_TEXT.share.line, audience: UI_TEXT.share.audience },
    },
  );
  await page.evaluate(() => Promise.all([...document.images].map((image) => image.decode())));
  await page.evaluate(() => document.fonts.ready);

  const drawn = await page.screenshot({ type: "png" });
  let quality = 88;
  let picture = await sharp(drawn).resize(WIDTH, HEIGHT).jpeg({ quality, mozjpeg: true }).toBuffer();
  while (picture.byteLength > MAX_BYTES && quality > 60) {
    quality -= 6;
    picture = await sharp(drawn).resize(WIDTH, HEIGHT).jpeg({ quality, mozjpeg: true }).toBuffer();
  }

  for (const name of ["opengraph-image", "twitter-image"]) {
    await writeFile(`${OUT}/${name}.jpg`, picture);
    await writeFile(`${OUT}/${name}.alt.txt`, UI_TEXT.share.imageAlt);
  }
  console.log(
    `Wrote ${OUT}/opengraph-image.jpg and twitter-image.jpg: ${picture.byteLength} bytes, quality ${quality}.`,
  );
} finally {
  await browser.close();
}
