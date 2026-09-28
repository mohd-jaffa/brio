// Builds the launch splash's art (the user, 2026-09-28: "use these 2 images as
// small branded splash + loader") from the supplied images in
// design-references/brand/ — which stay uncommitted — into src/assets/splash/,
// which is committed. Run it only where the references are.
//
//   design-references/brand/splash-portrait.png   →  src/assets/splash/portrait.webp
//   design-references/brand/splash-landscape.png  →  src/assets/splash/landscape.webp
//
// Each is a bakery scene around a plain cream middle, where the supplied image
// draws the wordmark, the line and a progress bar. Those three are painted
// out, so the app can set the real ones there — sharp at any size, and a bar
// that moves with the launch (LaunchSplash). Each box below was measured to
// sit on plain cream all round its edge; the script checks it still does, then
// fills the box from its four edges, so the cream's gentle shading runs on.
//
//   node scripts/splash.mjs
import fs from "node:fs";

import sharp from "sharp";

const OUT = "src/assets/splash";
const QUALITY = 80;
const MAX_BYTES = 200 * 1024;
// The middle's cream: lighter than this in every channel, and this grey.
const CREAM_MIN = 238;
const CREAM_MAX_CHROMA = 20;

// [left, top, right, bottom], inclusive: the wordmark with its leaf, the line, the bar.
const ART = {
  portrait: {
    from: "design-references/brand/splash-portrait.png",
    boxes: [
      [245, 612, 712, 864],
      [205, 870, 742, 917],
      [328, 958, 614, 997],
    ],
  },
  landscape: {
    from: "design-references/brand/splash-landscape.png",
    boxes: [
      [510, 296, 1025, 547],
      [528, 556, 1012, 600],
      [636, 652, 900, 684],
    ],
  },
};

// The edges are averaged along their length over this many pixels either way,
// so the cream's fine grain is not drawn out into streaks across the box.
const SMOOTH = 16;
// The same grain, added back: the patch would otherwise read as flatter than
// the cream around it.
const GRAIN_BAND = 6;

/** A deterministic stream of numbers in [-1, 1), so the build gives the same file every time. */
function grain(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 31 - 1;
  };
}

/**
 * Fills a box from its edges (a Coons patch): each pixel blends the four
 * smoothed edges it lies between, plus grain as strong as the cream's around it.
 */
function fill(pixels, width, [left, top, right, bottom], key) {
  const at = (x, y, c) => pixels[(y * width + x) * 3 + c];
  const isCream = (x, y) => {
    const rgb = [0, 1, 2].map((c) => at(x, y, c));
    return Math.min(...rgb) >= CREAM_MIN && Math.max(...rgb) - Math.min(...rgb) <= CREAM_MAX_CHROMA;
  };
  for (let x = left; x <= right; x++) {
    if (!isCream(x, top) || !isCream(x, bottom)) throw new Error(`${key}: a box's edge is not plain cream at x ${x}`);
  }
  for (let y = top; y <= bottom; y++) {
    if (!isCream(left, y) || !isCream(right, y)) throw new Error(`${key}: a box's edge is not plain cream at y ${y}`);
  }

  // Each edge as a smoothed profile, one per channel.
  const profile = (length, sample) =>
    [0, 1, 2].map((c) =>
      Array.from({ length }, (_, i) => {
        let sum = 0;
        let count = 0;
        for (let j = Math.max(0, i - SMOOTH); j <= Math.min(length - 1, i + SMOOTH); j++) {
          sum += sample(j, c);
          count++;
        }
        return sum / count;
      }),
    );
  const w = right - left;
  const h = bottom - top;
  const topEdge = profile(w + 1, (i, c) => at(left + i, top, c));
  const bottomEdge = profile(w + 1, (i, c) => at(left + i, bottom, c));
  const leftEdge = profile(h + 1, (i, c) => at(left, top + i, c));
  const rightEdge = profile(h + 1, (i, c) => at(right, top + i, c));

  // How much the cream varies just outside the box.
  let sum = 0;
  let squares = 0;
  let count = 0;
  for (let y = top - GRAIN_BAND; y <= bottom + GRAIN_BAND; y++) {
    for (let x = left - GRAIN_BAND; x <= right + GRAIN_BAND; x++) {
      if (x >= left && x <= right && y >= top && y <= bottom) continue;
      const value = at(x, y, 1);
      sum += value;
      squares += value * value;
      count++;
    }
  }
  const spread = Math.sqrt(Math.max(0, squares / count - (sum / count) ** 2));
  const noise = grain(left * 7919 + top);

  for (let y = top + 1; y < bottom; y++) {
    const v = (y - top) / h;
    for (let x = left + 1; x < right; x++) {
      const u = (x - left) / w;
      const i = x - left;
      const j = y - top;
      const shade = noise() * spread;
      for (let c = 0; c < 3; c++) {
        const edges = (1 - v) * topEdge[c][i] + v * bottomEdge[c][i] + (1 - u) * leftEdge[c][j] + u * rightEdge[c][j];
        const bilinear =
          (1 - u) * (1 - v) * topEdge[c][0] + u * (1 - v) * topEdge[c][w] + (1 - u) * v * bottomEdge[c][0] + u * v * bottomEdge[c][w];
        pixels[(y * width + x) * 3 + c] = Math.min(255, Math.max(0, Math.round(edges - bilinear + shade)));
      }
    }
  }
}

fs.mkdirSync(OUT, { recursive: true });
for (const [key, { from, boxes }] of Object.entries(ART)) {
  if (!fs.existsSync(from)) throw new Error(`${from} is missing: the splash is built from the design references.`);
  const { data, info } = await sharp(from).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  for (const box of boxes) fill(data, info.width, box, key);
  const webp = await sharp(data, { raw: { width: info.width, height: info.height, channels: 3 } })
    .webp({ quality: QUALITY, effort: 6 })
    .toBuffer();
  if (webp.length > MAX_BYTES) throw new Error(`${key}: ${Math.round(webp.length / 1024)} KB, over ${MAX_BYTES / 1024} KB`);
  fs.writeFileSync(`${OUT}/${key}.webp`, webp);
  console.log(`${OUT}/${key}.webp: ${info.width}×${info.height}, ${Math.round(webp.length / 1024)} KB`);
}
