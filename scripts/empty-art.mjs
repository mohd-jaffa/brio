// Builds the empty states' art (the user, 2026-09-28) from the supplied sheet
// in design-references/ — which stays uncommitted — into src/assets/empty/,
// which is committed. Run it only where the references are.
//
//   design-references/empty-states.png  →  src/assets/empty/<key>.webp
//
// The sheet is fifteen drawings on a white ground, five by three, each on a
// soft cream backdrop above its own caption. The app shows six of them, where
// a list of its own is empty; the rest are of things the app does not have.
// Each is found in its fifth of its row as the first band of ink from the top
// (the caption sits below a clear gap), cut out with a margin, and its white
// ground made see-through: colour-to-alpha against white, from the border
// inwards and only through the ground and its backdrop, so the drawing's own
// pale paper, inside its outline, stays. It refuses a drawing that runs to the
// edge of its fifth: the sheet is then not the grid this expects.
//
//   node scripts/empty-art.mjs
import fs from "node:fs";
import path from "node:path";

import sharp from "sharp";

const SHEET = "design-references/empty-states.png";
const OUT = "src/assets/empty";
const COLUMNS = 5;
// Where each row of drawings and captions starts. The rows are not evenly
// spaced — the first row's buttons reach past a third of the sheet — so these
// are measured: each falls in the white between one row's captions and the
// next row's drawings.
const ROW_TOPS = [0, 390, 700];
const MARGIN = 6;
const MAX_BYTES = 40 * 1024;
const QUALITY = 86;
// Ink is any pixel darker than this in some channel; the ground is white.
const INK_BELOW = 246;
// Rows with no more ink than this, this many in a row, end a drawing.
const GAP_ROWS = 8;
// The ground and the cream backdrop: this light and this grey. The palest part
// of any drawing — the chart's sage bars — is darker than this.
const GROUND_MIN = 215;
const GROUND_MAX_CHROMA = 45;

// Where each drawing the app uses sits, as [column, row], and what it shows.
// The keys are EMPTY_ART's in src/assets/empty/index.ts.
const ART = {
  "open-box": [0, 0],
  "storefront": [1, 0],
  "clipboard": [2, 0],
  "people": [3, 1],
  "bar-chart": [4, 1],
  "bell": [3, 2],
};

if (!fs.existsSync(SHEET)) throw new Error(`${SHEET} is missing: the empty states' art is built from the design references.`);

/** White ground and cream backdrop that reach the border become see-through. */
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

/** The drawing in one cell: the first band of ink from the top, and the ink's width in it. */
function findDrawing(key, pixels, sheetWidth, cell) {
  const inked = (x, y) => {
    const i = (y * sheetWidth + x) * 3;
    return Math.min(pixels[i], pixels[i + 1], pixels[i + 2]) < INK_BELOW;
  };
  const inkIn = (y) => {
    let count = 0;
    for (let x = cell.left; x < cell.right; x++) if (inked(x, y)) count++;
    return count;
  };

  let top = -1;
  let bottom = -1;
  let gap = 0;
  for (let y = cell.top; y < cell.bottom; y++) {
    if (inkIn(y) > 2) {
      if (top < 0) top = y;
      bottom = y;
      gap = 0;
    } else if (top >= 0 && ++gap >= GAP_ROWS) break;
  }
  if (top < 0) throw new Error(`${key}: no drawing in its cell`);

  let left = cell.right;
  let right = cell.left;
  for (let y = top; y <= bottom; y++) {
    for (let x = cell.left; x < cell.right; x++) {
      if (!inked(x, y)) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
    }
  }
  if (top === cell.top || left === cell.left || right === cell.right - 1) {
    throw new Error(`${key}: the drawing runs to the edge of its cell`);
  }
  return {
    left: Math.max(cell.left, left - MARGIN),
    top: Math.max(cell.top, top - MARGIN),
    right: Math.min(cell.right - 1, right + MARGIN),
    bottom: Math.min(cell.bottom - 1, bottom + MARGIN),
  };
}

async function build(key, [column, row], sheet) {
  const cell = {
    left: Math.round((column * sheet.width) / COLUMNS),
    right: Math.round(((column + 1) * sheet.width) / COLUMNS),
    top: ROW_TOPS[row],
    bottom: ROW_TOPS[row + 1] ?? sheet.height,
  };
  const box = findDrawing(key, sheet.pixels, sheet.width, cell);
  const { data, info } = await sharp(SHEET)
    .extract({ left: box.left, top: box.top, width: box.right - box.left + 1, height: box.bottom - box.top + 1 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  clearGround(data, info.width, info.height);

  const webp = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .trim({ threshold: 0 })
    .webp({ quality: QUALITY, alphaQuality: 90, effort: 6 })
    .toBuffer({ resolveWithObject: true });
  if (webp.data.length > MAX_BYTES) throw new Error(`${key}: ${Math.round(webp.data.length / 1024)} KB, over ${MAX_BYTES / 1024} KB`);

  fs.writeFileSync(path.join(OUT, `${key}.webp`), webp.data);
  return `${key} ${webp.info.width}×${webp.info.height}, ${Math.round(webp.data.length / 1024)} KB`;
}

const { data: pixels, info } = await sharp(SHEET).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const sheet = { pixels, width: info.width, height: info.height };
fs.mkdirSync(OUT, { recursive: true });
const written = [];
for (const [key, place] of Object.entries(ART)) written.push(await build(key, place, sheet));
console.log(`Wrote ${written.length} WebPs to ${OUT}:\n  ${written.join("\n  ")}`);
