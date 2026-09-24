// Builds the illustration library the app ships (plan §139.11.10, R1.15):
//
//   artwork/illustrations/<key>.jpg  →  src/assets/illustrations/<key>.webp
//
// Each master is a drawing on a white ground. The ground becomes transparent —
// only the white that reaches the border, so white inside an outline (a
// cupcake's cream, a cup) stays — using colour-to-alpha against white, so the
// soft ground shadows become translucent rather than grey patches on a cream
// theme. The drawing is then trimmed, centred on a square with a little room,
// and written as a 512 px WebP with alpha.
//
// It refuses, before writing anything, a file name that is not a key, and a
// master that duplicates another by content or by look (a perceptual hash).
//
//   node scripts/illustrations.mjs          build every master
//   node scripts/illustrations.mjs --check  only check names and duplicates
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import sharp from "sharp";

const MASTERS = "artwork/illustrations";
const OUT = "src/assets/illustrations";
const SIZE = 480;
const PADDING = 0.08;
const MAX_BYTES = 40 * 1024;
const KEY = /^[a-z0-9]+(-[a-z0-9]+)*$/;
// Two masters closer than this (of 256 bits) are the same picture.
const DUPLICATE_DISTANCE = 10;
// A pixel this close to white, and this grey, can be ground or shadow.
const GROUND_MIN = 150;
const GROUND_MAX_CHROMA = 28;

const masters = fs
  .readdirSync(MASTERS)
  .filter((file) => /\.(jpe?g|png)$/i.test(file))
  .sort();

/** A 256-bit difference hash: how the picture's brightness falls left to right. */
async function dHash(file) {
  const { data } = await sharp(file).greyscale().resize(17, 16, { fit: "fill" }).raw().toBuffer({ resolveWithObject: true });
  let bits = 0n;
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) bits = (bits << 1n) | (data[y * 17 + x] > data[y * 17 + x + 1] ? 1n : 0n);
  }
  return bits;
}

const distance = (a, b) => (a ^ b).toString(2).split("").filter((bit) => bit === "1").length;

async function check() {
  const problems = [];
  const byContent = new Map();
  const hashes = [];
  for (const file of masters) {
    const key = path.parse(file).name;
    if (!KEY.test(key)) problems.push(`${file}: the name is not a key (lowercase words joined by hyphens)`);
    const full = path.join(MASTERS, file);
    const digest = createHash("sha256").update(fs.readFileSync(full)).digest("hex");
    if (byContent.has(digest)) problems.push(`${file}: the same file as ${byContent.get(digest)}`);
    byContent.set(digest, file);
    const hash = await dHash(full);
    for (const [other, otherHash] of hashes) {
      const d = distance(hash, otherHash);
      if (d <= DUPLICATE_DISTANCE) problems.push(`${file}: looks like ${other} (distance ${d} of 256)`);
    }
    hashes.push([file, hash]);
  }
  return problems;
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

    // Colour-to-alpha against white: the least-white channel says how much of
    // the pixel is drawing, and the colour is what remains once white is lifted.
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

async function build(file) {
  const key = path.parse(file).name;
  const { data, info } = await sharp(path.join(MASTERS, file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  clearGround(data, info.width, info.height);

  const cleared = sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } });
  const trimmed = await cleared.png().toBuffer().then((png) => sharp(png).trim({ threshold: 0 }).toBuffer({ resolveWithObject: true }));
  const side = Math.round(Math.max(trimmed.info.width, trimmed.info.height) / (1 - 2 * PADDING));

  // Two passes on purpose: sharp resizes before it extends whatever order the
  // calls are written in, so one pipeline would crop the drawing to a square
  // and then pad it.
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
    .webp({ quality: 82, alphaQuality: 90, effort: 6 })
    .toBuffer();

  fs.writeFileSync(path.join(OUT, `${key}.webp`), webp);
  return { key, bytes: webp.length };
}

const problems = await check();
if (problems.length) {
  for (const problem of problems) console.error(problem);
  process.exit(1);
}
console.log(`${masters.length} masters: names are keys, no duplicates.`);
if (process.argv.includes("--check")) process.exit(0);

fs.mkdirSync(OUT, { recursive: true });
let total = 0;
const heavy = [];
for (const file of masters) {
  const { key, bytes } = await build(file);
  total += bytes;
  if (bytes > MAX_BYTES) heavy.push(`${key} (${Math.round(bytes / 1024)} KB)`);
}
console.log(`Wrote ${masters.length} WebPs to ${OUT}: ${Math.round(total / 1024)} KB in all.`);
if (heavy.length) {
  console.error(`Over ${MAX_BYTES / 1024} KB: ${heavy.join(", ")}`);
  process.exit(1);
}
