// Builds the illustration library the app ships (plan §139.11.10, R1.15):
//
//   artwork/illustrations/<key>.jpg  →  src/assets/illustrations/<key>.webp
//
// Each master is a drawing on a white ground. The ground becomes transparent —
// only the white that reaches the border, so white inside an outline (a
// cupcake's cream, a cup) stays — using colour-to-alpha against white, so the
// soft ground shadows become translucent rather than grey patches on a cream
// theme. Ground the border cannot reach (a donut's hole) is cleared from a
// point named in HOLES. The drawing is then trimmed, centred on a square with
// a little room, and written as a 480 px WebP with alpha.
//
// It refuses, before writing anything, a file name that is not a key, a
// master that duplicates another by content or by look (a perceptual hash),
// and a hole for a master that does not exist or a point that is not ground.
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
// Quality 82; a drawing too busy to fit MAX_BYTES at 82 takes the first step
// down that does.
const QUALITIES = [82, 78, 74, 70];
const KEY = /^[a-z0-9]+(-[a-z0-9]+)*$/;
// Two masters closer than this (of 256 bits) are the same picture.
const DUPLICATE_DISTANCE = 10;
// A pixel this close to white, and this grey, can be ground or shadow.
const GROUND_MIN = 150;
const GROUND_MAX_CHROMA = 28;
// Ground an outline closes off from the border, which the border's flood never
// reaches: a donut's hole, inside a cup's handle, between a bow and its string.
// Each is a point inside it, as fractions of the master's width and height,
// and is cleared from there just as the border is. White an outline closes off
// and is not named here is drawing — the cream, the cup, the receipt — and stays.
const HOLES = {
  "bow-and-arrow": [[0.474, 0.414], [0.486, 0.591]],
  "capybara-headphones": [[0.503, 0.201]],
  "cookie-cup": [[0.811, 0.576]],
  "cupid": [[0.661, 0.549], [0.632, 0.678]],
  "default-product": [[0.678, 0.23]],
  "donut": [[0.499, 0.482]],
  "heart-balloons": [[0.739, 0.528], [0.249, 0.547]],
  "heart-padlock": [[0.476, 0.357]],
  "love-locks": [[0.618, 0.345], [0.284, 0.453]],
};

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
  const keys = new Set(masters.map((file) => path.parse(file).name));
  for (const key of Object.keys(HOLES)) if (!keys.has(key)) problems.push(`HOLES names ${key}, which has no master`);
  return problems;
}

/** White ground (and its shadows) that reaches the border, or a hole, becomes see-through. */
function clearGround(pixels, width, height, holes) {
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
  for (const [fx, fy] of holes) {
    const p = Math.floor(fy * height) * width + Math.floor(fx * width);
    if (!isGround(p * 4)) throw new Error(`a hole at (${fx}, ${fy}) is not ground`);
    stack.push(p);
  }

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
  try {
    clearGround(data, info.width, info.height, HOLES[key] ?? []);
  } catch (error) {
    throw new Error(`${file}: ${error.message}`);
  }

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

  const sized = await sharp(square).resize(SIZE, SIZE, { kernel: "lanczos3" }).png().toBuffer();
  let webp;
  let quality;
  for (quality of QUALITIES) {
    webp = await sharp(sized).webp({ quality, alphaQuality: 90, effort: 6 }).toBuffer();
    if (webp.length <= MAX_BYTES) break;
  }

  fs.writeFileSync(path.join(OUT, `${key}.webp`), webp);
  return { key, bytes: webp.length, quality };
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
const eased = [];
for (const file of masters) {
  const { key, bytes, quality } = await build(file);
  total += bytes;
  if (bytes > MAX_BYTES) heavy.push(`${key} (${Math.round(bytes / 1024)} KB)`);
  else if (quality !== QUALITIES[0]) eased.push(`${key} (quality ${quality})`);
}
console.log(`Wrote ${masters.length} WebPs to ${OUT}: ${Math.round(total / 1024)} KB in all.`);
if (eased.length) console.log(`Stepped down to fit ${MAX_BYTES / 1024} KB: ${eased.join(", ")}`);
if (heavy.length) {
  console.error(`Over ${MAX_BYTES / 1024} KB: ${heavy.join(", ")}`);
  process.exit(1);
}
