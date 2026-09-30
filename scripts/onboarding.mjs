// Builds the welcome's pictures (the user, 2026-09-30: "you can take the help
// of these 2 images, create an onboarding splash screens with small
// introduction slides") from the supplied sheet in
// design-references/onboarding/ — which stays uncommitted — into
// src/assets/onboarding/, which is committed. Run it only where the
// references are.
//
//   design-references/onboarding/scenes.jpg  (6144 × 4096)  →  src/assets/onboarding/<scene>.webp
//
// The sheet sets fifteen scenes on white paper. Each one used is cut out
// along the paper round it: the paper reached from the box's edge becomes
// transparent, so the scene sits on either theme's ground, while a white
// inside it — a calendar's page, a cake's icing — stays. Anything the box's
// edge cuts through is a neighbouring scene, and is left out.
//
// The second sheet (scenes-alt.png) draws the same scenes at half the size;
// only this one is sharp enough for a phone's screen.
//
//   node scripts/onboarding.mjs
import fs from "node:fs";

import sharp from "sharp";

const SOURCE = "design-references/onboarding/scenes.jpg";
const OUT = "src/assets/onboarding";
const LONGEST_SIDE = 1200;
const MAX_BYTES = 200 * 1024;

// Paper: lighter than this in every channel, and this grey.
const PAPER_MIN = 244;
const PAPER_MAX_CHROMA = 10;
// A speck the upscaler left in the paper, not part of any scene.
const SPECK_PIXELS = 600;
// Room left round the scene, in pixels of the sheet.
const MARGIN = 24;

// [left, top, right, bottom] on the sheet, inclusive: a box round each scene,
// clear of its neighbours' middles.
const SCENES = {
  // A maker piping a cake: the welcome.
  maker: [62, 108, 1500, 1560],
  // A desk calendar with two days ticked: orders by when they are due.
  calendar: [3690, 1690, 5120, 2580],
  // A bouquet with a tag: the bill.
  bouquet: [2440, 150, 3600, 1560],
  // The maker at her laptop, the list ticked: stock and money.
  desk: [4630, 280, 6070, 1560],
};

function cutOut(pixels, width, height) {
  const count = width * height;
  const paper = new Uint8Array(count);
  for (let p = 0; p < count; p++) {
    const r = pixels[p * 3];
    const g = pixels[p * 3 + 1];
    const b = pixels[p * 3 + 2];
    const low = Math.min(r, g, b);
    paper[p] = low >= PAPER_MIN && Math.max(r, g, b) - low <= PAPER_MAX_CHROMA ? 1 : 0;
  }

  // The paper reached from the box's edge, four ways.
  const outside = new Uint8Array(count);
  const queue = new Int32Array(count);
  let head = 0;
  let tail = 0;
  const reach = (p) => {
    if (paper[p] && !outside[p]) {
      outside[p] = 1;
      queue[tail++] = p;
    }
  };
  for (let x = 0; x < width; x++) {
    reach(x);
    reach((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    reach(y * width);
    reach(y * width + width - 1);
  }
  while (head < tail) {
    const p = queue[head++];
    const x = p % width;
    if (x > 0) reach(p - 1);
    if (x < width - 1) reach(p + 1);
    if (p >= width) reach(p - width);
    if (p < count - width) reach(p + width);
  }

  // Everything else, in pieces joined eight ways. The largest piece is the
  // scene; any other piece the edge cuts through is a neighbour's, and a
  // speck is dust.
  const piece = new Int32Array(count).fill(-1);
  const pieces = [];
  for (let start = 0; start < count; start++) {
    if (outside[start] || piece[start] >= 0) continue;
    const id = pieces.length;
    let size = 0;
    let touchesEdge = false;
    head = 0;
    tail = 0;
    piece[start] = id;
    queue[tail++] = start;
    while (head < tail) {
      const p = queue[head++];
      size++;
      const x = p % width;
      const y = (p - x) / width;
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) touchesEdge = true;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const q = ny * width + nx;
          if (!outside[q] && piece[q] < 0) {
            piece[q] = id;
            queue[tail++] = q;
          }
        }
      }
    }
    pieces.push({ size, touchesEdge });
  }
  const largest = pieces.reduce((best, current, id) => (current.size > pieces[best].size ? id : best), 0);
  const kept = pieces.map((current, id) => id === largest || (!current.touchesEdge && current.size >= SPECK_PIXELS));
  if (pieces[largest].size < count * 0.2) throw new Error("the largest piece is too small to be the scene");

  const alpha = Buffer.alloc(count);
  let [left, top, right, bottom] = [width, height, 0, 0];
  for (let p = 0; p < count; p++) {
    if (outside[p] || !kept[piece[p]]) continue;
    alpha[p] = 255;
    const x = p % width;
    const y = (p - x) / width;
    left = Math.min(left, x);
    right = Math.max(right, x);
    top = Math.min(top, y);
    bottom = Math.max(bottom, y);
  }
  return { alpha, bounds: [left, top, right, bottom] };
}

if (!fs.existsSync(SOURCE)) throw new Error(`${SOURCE} is missing: the welcome's pictures are built from it.`);
fs.mkdirSync(OUT, { recursive: true });

for (const [name, [boxLeft, boxTop, boxRight, boxBottom]] of Object.entries(SCENES)) {
  const width = boxRight - boxLeft + 1;
  const height = boxBottom - boxTop + 1;
  const pixels = await sharp(SOURCE)
    .extract({ left: boxLeft, top: boxTop, width, height })
    .removeAlpha()
    .raw()
    .toBuffer();
  const { alpha, bounds } = cutOut(pixels, width, height);

  // The edge softened by a little under a pixel, so it does not step.
  const softened = await sharp(alpha, { raw: { width, height, channels: 1 } })
    .blur(0.6)
    .extractChannel(0)
    .raw()
    .toBuffer();
  if (softened.length !== width * height) throw new Error(`${name}: the softened edge is not one channel`);
  const [left, top, right, bottom] = [
    Math.max(0, bounds[0] - MARGIN),
    Math.max(0, bounds[1] - MARGIN),
    Math.min(width - 1, bounds[2] + MARGIN),
    Math.min(height - 1, bounds[3] + MARGIN),
  ];

  const rgba = await sharp(pixels, { raw: { width, height, channels: 3 } })
    .joinChannel(softened, { raw: { width, height, channels: 1 } })
    .raw()
    .toBuffer();
  const cut = sharp(rgba, { raw: { width, height, channels: 4 } })
    .extract({ left, top, width: right - left + 1, height: bottom - top + 1 })
    .resize({ width: LONGEST_SIDE, height: LONGEST_SIDE, fit: "inside", withoutEnlargement: true });

  let quality = 84;
  let output = await cut.clone().webp({ quality, alphaQuality: 90, effort: 6 }).toBuffer();
  while (output.length > MAX_BYTES && quality > 50) {
    quality -= 6;
    output = await cut.clone().webp({ quality, alphaQuality: 90, effort: 6 }).toBuffer();
  }
  if (output.length > MAX_BYTES) throw new Error(`${name} is still over ${MAX_BYTES} bytes`);
  fs.writeFileSync(`${OUT}/${name}.webp`, output);
  const { width: outWidth, height: outHeight } = await sharp(output).metadata();
  console.log(`${name}: ${outWidth} × ${outHeight}, ${Math.round(output.length / 1024)} KB at quality ${quality}`);
}
