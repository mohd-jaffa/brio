// Builds the profile pictures from the supplied sheets in design-references/ —
// which stay uncommitted — into src/assets/avatars/, which is committed. Run it
// only where the references are.
//
//   design-references/profile-pictures.jpg         →  nine animals (2026-09-27)
//   design-references/profile-pictures-people.png  →  24 people (2026-09-28)
//                                                  →  src/assets/avatars/<key>.webp
//
// The animals' sheet is nine animals on a white ground, three by three, each within its
// own third of the sheet. Each third is cut out, its white ground made
// see-through (colour-to-alpha against white, from the border inwards, so the
// white inside an outline — the polar bear's fur — stays), trimmed, centred on
// a square with enough room that the ears stay inside a circle, and written as
// a WebP with alpha. It refuses a drawing that runs to the edge of its third:
// the sheet is then not the grid this expects.
//
// The people's sheet is 24 portraits, six by four, each on a pastel disc on
// white. The rows are not evenly spaced, so each disc is found as what it is —
// a connected shape that is not white — and cut round its centre, 1.5 px
// inside its edge so no white fringe is kept, the corners see-through. It
// fills the round well it is shown in. It refuses a sheet without exactly 24
// discs, or a shape that is not round.
//
//   node scripts/avatars.mjs
import fs from "node:fs";
import path from "node:path";

import sharp from "sharp";

const SHEET = "design-references/profile-pictures.jpg";
const PEOPLE_SHEET = "design-references/profile-pictures-people.png";
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

// The people, in their sheet's order, left to right and top to bottom.
const PEOPLE = [
  ["green-hoodie", "wavy-hair", "round-glasses", "top-bun", "full-beard", "sun-hat"],
  ["curly-hair", "flower-clip", "headphones", "coffee-mug", "green-shirt", "purple-hoodie"],
  ["grandpa", "grandma", "dungarees", "pigtails", "cap", "hoop-earrings"],
  ["cream-hoodie", "daydream", "goatee", "bucket-hat", "navy-hoodie", "low-bun"],
];
// A disc's pixels are darker than this in some channel; the ground is white.
const DISC_MAX = 240;
// A shape this big is a disc; anything smaller is a speck on the ground.
const DISC_MIN_AREA = 10000;
const DISC_INSET = 1.5;

for (const sheet of [SHEET, PEOPLE_SHEET]) {
  if (!fs.existsSync(sheet)) throw new Error(`${sheet} is missing: the profile pictures are built from the design references.`);
}

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

/** Every disc on the people's sheet: its centre and radius, row by row, left to right. */
async function findDiscs() {
  const { data, info } = await sharp(PEOPLE_SHEET).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const inDisc = (p) => Math.min(data[p * 3], data[p * 3 + 1], data[p * 3 + 2]) < DISC_MAX;
  const seen = new Uint8Array(width * height);
  const discs = [];
  for (let start = 0; start < width * height; start++) {
    if (seen[start] || !inDisc(start)) continue;
    seen[start] = 1;
    const stack = [start];
    let area = 0;
    let sumX = 0;
    let sumY = 0;
    let [left, top, right, bottom] = [width, height, 0, 0];
    while (stack.length) {
      const p = stack.pop();
      const x = p % width;
      const y = (p - x) / width;
      area++;
      sumX += x;
      sumY += y;
      [left, top, right, bottom] = [Math.min(left, x), Math.min(top, y), Math.max(right, x), Math.max(bottom, y)];
      for (const next of [x > 0 && p - 1, x < width - 1 && p + 1, y > 0 && p - width, y < height - 1 && p + width]) {
        if (next !== false && !seen[next] && inDisc(next)) {
          seen[next] = 1;
          stack.push(next);
        }
      }
    }
    if (area < DISC_MIN_AREA) continue;
    // A circle fills π/4 of its box; anything else is not a disc.
    const fill = area / ((right - left + 1) * (bottom - top + 1));
    if (Math.abs(fill - Math.PI / 4) > 0.03) throw new Error(`A shape at ${left},${top} is not round (fills ${fill.toFixed(2)} of its box)`);
    discs.push({ cx: sumX / area + 0.5, cy: sumY / area + 0.5, r: Math.sqrt(area / Math.PI) });
  }
  const expected = PEOPLE.flat().length;
  if (discs.length !== expected) throw new Error(`${PEOPLE_SHEET}: ${discs.length} discs, not ${expected}`);
  // Into rows: a disc starts a new row once it sits a radius below the last.
  discs.sort((a, b) => a.cy - b.cy);
  const rows = [];
  for (const disc of discs) {
    const row = rows.at(-1);
    if (row && disc.cy - row[0].cy < disc.r) row.push(disc);
    else rows.push([disc]);
  }
  return rows.flatMap((row) => row.sort((a, b) => a.cx - b.cx));
}

/** A disc cut to its own edge, less the inset, so it fills the round well it is shown in. */
async function buildPerson(key, disc) {
  const side = Math.floor(2 * (disc.r - DISC_INSET));
  const left = Math.round(disc.cx - side / 2);
  const top = Math.round(disc.cy - side / 2);
  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${side}" height="${side}"><circle cx="${side / 2}" cy="${side / 2}" r="${side / 2}" fill="#fff"/></svg>`,
  );
  const cut = await sharp(PEOPLE_SHEET)
    .extract({ left, top, width: side, height: side })
    .ensureAlpha()
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
  const webp = await sharp(cut)
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
const discs = await findDiscs();
for (const [index, key] of PEOPLE.flat().entries()) total += await buildPerson(key, discs[index]);
console.log(`Wrote ${KEYS.flat().length + PEOPLE.flat().length} WebPs to ${OUT}: ${Math.round(total / 1024)} KB in all.`);
