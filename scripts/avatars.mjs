// Builds the profile pictures (the user, 2026-09-27) from the supplied sheet in
// design-references/ — which stays uncommitted — into src/assets/avatars/,
// which is committed. Run it only where the references are.
//
//   design-references/profile-pictures.jpg  →  src/assets/avatars/<key>.webp
//
// The sheet is nine animals on a white ground, three by three, each within its
// own third of the sheet. Each third is cut out, its white ground made
// see-through (colour-to-alpha against white, from the border inwards, so the
// white inside an outline — the polar bear's fur — stays), trimmed, centred on
// a square with enough room that the ears stay inside a circle, and written as
// a WebP with alpha. It refuses a drawing that runs to the edge of its third:
// the sheet is then not the grid this expects.
//
//   node scripts/avatars.mjs
import fs from "node:fs";
import path from "node:path";

import sharp from "sharp";

const SHEET = "design-references/profile-pictures.jpg";
const OUT = "src/assets/avatars";
const SIZE = 320;
const PADDING = 0.1;
const MAX_BYTES = 24 * 1024;
const QUALITY = 84;
// A pixel this close to white, and this grey, can be ground or its shadow.
const GROUND_MIN = 150;
const GROUND_MAX_CHROMA = 28;

// In the sheet's order, left to right and top to bottom. The keys are
// AVATAR_KEYS in src/constants/avatars.ts, and 0026_profile_avatars.sql's.
const KEYS = [
  ["pomeranian", "hamster", "blue-bear"],
  ["husky", "polar-bear", "cream-kitten"],
  ["ginger-cat", "beagle", "tiger"],
];

if (!fs.existsSync(SHEET)) throw new Error(`${SHEET} is missing: the profile pictures are built from the design references.`);

/** White ground (and its shadows) that reaches the border becomes see-through. */
function clearGround(pixels, width, height) {
  const isGround = (i) => {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    return Math.min(r, g, b) >= GROUND_MIN && Math.max(r, g, b) - Math.min(r, g, b) <= GROUND_MAX_CHROMA;
  };

  const seen = new Uint8Array(width * height);
  const stack = [];
  for (let x = 0; x < width; x++) stack.push(x, (height - 1) * width + x);
  for (let y = 0; y < height; y++) stack.push(y * width, y * width + width - 1);

  while (stack.length) {
    const p = stack.pop();
    if (seen[p]) continue;
    seen[p] = 1;
    const i = p * 4;
    if (!isGround(i)) continue;

    const alpha = Math.max(255 - pixels[i], 255 - pixels[i + 1], 255 - pixels[i + 2]) / 255;
    for (let c = 0; c < 3; c++) {
      pixels[i + c] = alpha === 0 ? 0 : Math.round(Math.min(255, Math.max(0, (pixels[i + c] - 255 * (1 - alpha)) / alpha)));
    }
    pixels[i + 3] = Math.round(alpha * 255);

    const x = p % width;
    const y = (p - x) / width;
    if (x > 0) stack.push(p - 1);
    if (x < width - 1) stack.push(p + 1);
    if (y > 0) stack.push(p - width);
    if (y < height - 1) stack.push(p + width);
  }
}

/** Whether anything solid is left on the cell's edge once the ground is cleared. */
function touchesEdge(pixels, width, height) {
  const solid = (x, y) => pixels[(y * width + x) * 4 + 3] > 32;
  for (let x = 0; x < width; x++) if (solid(x, 0) || solid(x, height - 1)) return true;
  for (let y = 0; y < height; y++) if (solid(0, y) || solid(width - 1, y)) return true;
  return false;
}

async function build(key, column, row, sheet) {
  const cell = Math.floor(sheet.width / 3);
  const { data, info } = await sharp(SHEET)
    .extract({ left: column * cell, top: row * cell, width: cell, height: cell })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  clearGround(data, info.width, info.height);
  if (touchesEdge(data, info.width, info.height)) throw new Error(`${key}: the drawing runs to the edge of its third`);

  const cleared = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
  const trimmed = await sharp(cleared).trim({ threshold: 0 }).toBuffer({ resolveWithObject: true });
  const side = Math.round(Math.max(trimmed.info.width, trimmed.info.height) / (1 - 2 * PADDING));

  // Two passes, as the illustrations take: sharp resizes before it extends.
  const square = await sharp(trimmed.data)
    .extend({
      top: Math.floor((side - trimmed.info.height) / 2),
      bottom: Math.ceil((side - trimmed.info.height) / 2),
      left: Math.floor((side - trimmed.info.width) / 2),
      right: Math.ceil((side - trimmed.info.width) / 2),
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
  const webp = await sharp(square)
    .resize(SIZE, SIZE, { kernel: "lanczos3" })
    .webp({ quality: QUALITY, alphaQuality: 90, effort: 6 })
    .toBuffer();
  if (webp.length > MAX_BYTES) throw new Error(`${key}: ${Math.round(webp.length / 1024)} KB, over ${MAX_BYTES / 1024} KB`);

  fs.writeFileSync(path.join(OUT, `${key}.webp`), webp);
  return webp.length;
}

const sheet = await sharp(SHEET).metadata();
fs.mkdirSync(OUT, { recursive: true });
let total = 0;
for (const [row, keys] of KEYS.entries()) {
  for (const [column, key] of keys.entries()) total += await build(key, column, row, sheet);
}
console.log(`Wrote ${KEYS.flat().length} WebPs to ${OUT}: ${Math.round(total / 1024)} KB in all.`);
