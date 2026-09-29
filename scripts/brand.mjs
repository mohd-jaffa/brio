// Builds everything the brand ships as (the user, 2026-09-28: "these are the
// logos of the app") from the supplied files in design-references/brand/ —
// which stay uncommitted — into files that are committed. Run it only where
// the references are.
//
//   design-references/brand/app-icon.png   the "b" and its leaf on dark green,
//                                          a rounded square on white
//   design-references/brand/wordmark.png   "Brio", its leaf over the i, on white
//
//   public/icons/icon-192.png, icon-512.png  the manifest's icons ("any"): the
//                                            rounded square, corners see-through
//   public/icons/icon-maskable-512.png       Android's shaped icon: the mark on
//                                            green to the edges, inside the
//                                            middle 60 %, so no mask can cut it
//   src/app/apple-icon.png                   iOS's home-screen icon (180 px),
//                                            green to the edges: iOS rounds it
//   src/app/favicon.ico                      16, 32 and 48 px, the rounded square
//   src/assets/brand/icon.webp               the rounded square, for the app itself
//   src/assets/brand/wordmark.webp           the wordmark, its ground see-through
//   src/assets/brand/leaf.webp               the leaf alone, the smallest mark
//
// And, once the Android project exists (npx cap add android), its launcher
// icons and splash in android/app/src/main/res/:
//
//   mipmap-*/ic_launcher_foreground.png      the mark alone, for the adaptive
//                                            icon, inside its safe middle
//   mipmap-*/ic_launcher_monochrome.png      the mark as one colour, for
//                                            Android 13's themed icons
//   drawable/ic_launcher_background.xml      the icon's green, as a gradient
//   mipmap-*/ic_launcher.png, _round.png     the whole icon, for Android 7
//   drawable-xxhdpi/splash_icon.png          the icon the splash centres on
//                                            cream before Android 12
//   drawable-*/ic_stat_brio.png              the mark in white, for the status
//                                            bar and an order reminder (R8.6)
//
// A white ground becomes see-through by colour-to-alpha against white: from
// the border inwards for the icon, whose "b" is cream and must stay; over the
// whole of the wordmark, whose letters hold white counters.
//
//   node scripts/brand.mjs
import fs from "node:fs";

import sharp from "sharp";

const ICON = "design-references/brand/app-icon.png";
const WORDMARK = "design-references/brand/wordmark.png";
const ASSETS = "src/assets/brand";
const ICONS = "public/icons";
// The icon's green and anything blended with white at its edge are ground;
// the green itself (darker in every channel than this) is not.
const EDGE_MIN = 90;
const EDGE_MAX_CHROMA = 60;
// The mark's share of a full-bleed icon's side: Android's safe circle is the
// middle 80 %, and iOS's own icons keep their subject to about 60 %.
const MASKABLE_SHARE = 0.56;
const APPLE_SHARE = 0.6;
// The leaf is the wordmark's only warm colour: red well above blue.
const LEAF_WARMTH = 60;

for (const file of [ICON, WORDMARK]) {
  if (!fs.existsSync(file)) throw new Error(`${file} is missing: the brand is built from the design references.`);
}

// The supplied white is not quite white: anything this close to it is ground.
const WHITE_NOISE = 14;

/** Colour-to-alpha against white, in place, for one RGBA pixel at `i`. */
function unwhite(pixels, i) {
  const darkest = Math.max(255 - pixels[i], 255 - pixels[i + 1], 255 - pixels[i + 2]);
  const alpha = darkest <= WHITE_NOISE ? 0 : darkest / 255;
  for (let c = 0; c < 3; c++) {
    pixels[i + c] = alpha === 0 ? 0 : Math.round(Math.min(255, Math.max(0, (pixels[i + c] - 255 * (1 - alpha)) / alpha)));
  }
  pixels[i + 3] = Math.round(alpha * 255);
}

/** The icon's white ground, and its edge's blend into it, made see-through from the border in. */
async function roundedIcon() {
  const { data, info } = await sharp(ICON).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const isGround = (i) => {
    const low = Math.min(data[i], data[i + 1], data[i + 2]);
    return low >= EDGE_MIN && Math.max(data[i], data[i + 1], data[i + 2]) - low <= EDGE_MAX_CHROMA;
  };
  const seen = new Uint8Array(width * height);
  const stack = [];
  for (let x = 0; x < width; x++) stack.push(x, (height - 1) * width + x);
  for (let y = 0; y < height; y++) stack.push(y * width, y * width + width - 1);
  while (stack.length) {
    const p = stack.pop();
    if (seen[p]) continue;
    seen[p] = 1;
    if (!isGround(p * 4)) continue;
    unwhite(data, p * 4);
    const x = p % width;
    if (x > 0) stack.push(p - 1);
    if (x < width - 1) stack.push(p + 1);
    if (p >= width) stack.push(p - width);
    if (p < (height - 1) * width) stack.push(p + width);
  }
  const png = await sharp(data, { raw: { width, height, channels: 4 } }).png().toBuffer();
  return sharp(png).trim({ threshold: 0 }).png().toBuffer();
}

/**
 * The icon's green, sampled just inside its top-left and bottom-right corners,
 * and the mark — everything lighter than the green — lifted off it.
 */
async function markAndGreen(rounded) {
  const { data, info } = await sharp(rounded).raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const at = (x, y) => {
    const i = (Math.round(y) * width + Math.round(x)) * 4;
    return [data[i], data[i + 1], data[i + 2]];
  };
  const inset = width * 0.12;
  const from = at(inset, inset);
  const to = at(width - inset, height - inset);

  // Lightness above the green, ramped: the shadow under the "b" is darker
  // than the green, and is left behind with it.
  const mark = Buffer.alloc(width * height * 4);
  for (let p = 0; p < width * height; p++) {
    const i = p * 4;
    const green = [0, 1, 2].map((c) => from[c] + ((to[c] - from[c]) * (p % width + Math.floor(p / width))) / (width + height));
    const light = (data[i] * 0.3 + data[i + 1] * 0.59 + data[i + 2] * 0.11) - (green[0] * 0.3 + green[1] * 0.59 + green[2] * 0.11);
    const alpha = data[i + 3] === 255 ? Math.min(1, Math.max(0, (light - 25) / 70)) : 0;
    for (let c = 0; c < 3; c++) {
      mark[i + c] = alpha === 0 ? 0 : Math.round(Math.min(255, Math.max(0, (data[i + c] - green[c] * (1 - alpha)) / alpha)));
    }
    mark[i + 3] = Math.round(alpha * 255);
  }
  const lifted = await sharp(mark, { raw: { width, height, channels: 4 } }).png().toBuffer();
  const trimmed = await sharp(lifted).trim({ threshold: 0 }).png().toBuffer({ resolveWithObject: true });
  const hex = (rgb) => `#${rgb.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
  return { mark: trimmed, green: [hex(from), hex(to)] };
}

/** The mark centred on the icon's green, to every edge, `share` of the side tall. */
async function fullBleed(size, share, { mark, green }) {
  const tall = Math.round(size * share);
  const wide = Math.round((tall * mark.info.width) / mark.info.height);
  const scaled = await sharp(mark.data).resize(wide, tall).png().toBuffer();
  const ground = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${green[0]}"/><stop offset="1" stop-color="${green[1]}"/></linearGradient></defs>
  <rect width="${size}" height="${size}" fill="url(#g)"/>
</svg>`);
  return sharp(ground)
    .composite([{ input: scaled, left: Math.round((size - wide) / 2), top: Math.round((size - tall) / 2) }])
    .png(PNG)
    .toBuffer();
}

// A 256-colour PNG, dithered: the green's gradient shows no banding, at a
// quarter of the size.
const PNG = { palette: true, quality: 95, effort: 10, dither: 1, compressionLevel: 9 };

/** An .ico holding PNGs, one per size — every browser since 2007 reads them. */
async function favicon(rounded, sizes) {
  const images = await Promise.all(sizes.map((size) => sharp(rounded).resize(size, size).png({ compressionLevel: 9 }).toBuffer()));
  const header = Buffer.alloc(6 + 16 * sizes.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(sizes.length, 4);
  let offset = header.length;
  sizes.forEach((size, index) => {
    const entry = 6 + 16 * index;
    header.writeUInt8(size % 256, entry);
    header.writeUInt8(size % 256, entry + 1);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(images[index].length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += images[index].length;
  });
  return Buffer.concat([header, ...images]);
}

/** The wordmark with its white see-through, and the leaf cut from it. */
async function wordmarkAndLeaf() {
  const { data, info } = await sharp(WORDMARK).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  let [left, top, right, bottom] = [width, height, 0, 0];
  for (let p = 0; p < width * height; p++) {
    const i = p * 4;
    if (data[i] - data[i + 2] > LEAF_WARMTH) {
      const x = p % width;
      const y = (p - x) / width;
      [left, top, right, bottom] = [Math.min(left, x), Math.min(top, y), Math.max(right, x), Math.max(bottom, y)];
    }
    unwhite(data, i);
  }
  if (right <= left) throw new Error(`${WORDMARK}: no leaf found`);
  const clear = await sharp(data, { raw: { width, height, channels: 4 } }).png().toBuffer();
  const wordmark = await sharp(clear).trim({ threshold: 0 }).png().toBuffer();
  const margin = 4;
  const leaf = await sharp(clear)
    .extract({ left: left - margin, top: top - margin, width: right - left + 1 + 2 * margin, height: bottom - top + 1 + 2 * margin })
    .png()
    .toBuffer();
  return { wordmark, leaf };
}

fs.mkdirSync(ASSETS, { recursive: true });
fs.mkdirSync(ICONS, { recursive: true });

const rounded = await roundedIcon();
const lifted = await markAndGreen(rounded);
const { wordmark, leaf } = await wordmarkAndLeaf();

const written = {
  [`${ICONS}/icon-192.png`]: await sharp(rounded).resize(192, 192).png(PNG).toBuffer(),
  [`${ICONS}/icon-512.png`]: await sharp(rounded).resize(512, 512).png(PNG).toBuffer(),
  [`${ICONS}/icon-maskable-512.png`]: await fullBleed(512, MASKABLE_SHARE, lifted),
  "src/app/apple-icon.png": await fullBleed(180, APPLE_SHARE, lifted),
  "src/app/favicon.ico": await favicon(rounded, [16, 32, 48]),
  [`${ASSETS}/icon.webp`]: await sharp(rounded).resize(192, 192).webp({ quality: 90, alphaQuality: 95, effort: 6 }).toBuffer(),
  // Tall enough for the launch splash's largest, 380 px wide on a 2× screen.
  [`${ASSETS}/wordmark.webp`]: await sharp(wordmark).resize({ height: 360 }).webp({ quality: 90, alphaQuality: 95, effort: 6 }).toBuffer(),
  [`${ASSETS}/leaf.webp`]: await sharp(leaf).resize({ height: 96 }).webp({ quality: 90, alphaQuality: 95, effort: 6 }).toBuffer(),
};
// Android's densities, as multiples of a density-independent pixel.
const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
// An adaptive icon is 108 dp, of which only the middle 66 dp is sure to show.
const ADAPTIVE_SHARE = 0.4;
// A status-bar icon is 24 dp, its shape inside the middle 20 dp.
const STATUS_SHARE = 20 / 24;
const RES = "android/app/src/main/res";

/** The mark alone, centred on a see-through square `size` px, `share` of it tall — in one colour if `solid`. */
async function markOnly(size, share, { mark }, solid = false) {
  const tall = Math.round(size * share);
  const wide = Math.round((tall * mark.info.width) / mark.info.height);
  let scaled = sharp(mark.data).resize(wide, tall);
  if (solid) {
    // Its shape only: Android colours a themed icon itself.
    const alpha = await scaled.clone().extractChannel("alpha").toBuffer();
    scaled = sharp({ create: { width: wide, height: tall, channels: 3, background: "#ffffff" } }).joinChannel(alpha);
  }
  return sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: await scaled.png().toBuffer(), left: Math.round((size - wide) / 2), top: Math.round((size - tall) / 2) }])
    .png(PNG)
    .toBuffer();
}

/**
 * The status-bar icon: the mark's visible shape — cut to where it is more than
 * half opaque, since the lifted mark keeps a faint edge the launcher can
 * spare but 24 dp cannot — in white, filling the middle of `size` px.
 */
async function statusIcon(size, { mark }) {
  const { data, info } = await sharp(mark.data).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let [left, top, right, bottom] = [info.width, info.height, 0, 0];
  for (let p = 0; p < info.width * info.height; p++) {
    if (data[p * 4 + 3] < 128) continue;
    const x = p % info.width;
    const y = (p - x) / info.width;
    [left, top, right, bottom] = [Math.min(left, x), Math.min(top, y), Math.max(right, x), Math.max(bottom, y)];
  }
  const shape = await sharp(mark.data)
    .extract({ left, top, width: right - left + 1, height: bottom - top + 1 })
    .png()
    .toBuffer({ resolveWithObject: true });
  return markOnly(size, STATUS_SHARE, { mark: shape }, true);
}

if (fs.existsSync(RES)) {
  const circle = (size) =>
    Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}"/></svg>`);
  for (const [bucket, scale] of Object.entries(DENSITIES)) {
    const launcher = Math.round(48 * scale);
    const adaptive = Math.round(108 * scale);
    written[`${RES}/mipmap-${bucket}/ic_launcher.png`] = await sharp(rounded).resize(launcher, launcher).png(PNG).toBuffer();
    written[`${RES}/mipmap-${bucket}/ic_launcher_round.png`] = await sharp(await fullBleed(launcher, APPLE_SHARE, lifted))
      .composite([{ input: circle(launcher), blend: "dest-in" }])
      .png(PNG)
      .toBuffer();
    written[`${RES}/mipmap-${bucket}/ic_launcher_foreground.png`] = await markOnly(adaptive, ADAPTIVE_SHARE, lifted);
    written[`${RES}/mipmap-${bucket}/ic_launcher_monochrome.png`] = await markOnly(adaptive, ADAPTIVE_SHARE, lifted, true);
    written[`${RES}/drawable-${bucket}/ic_stat_brio.png`] = await statusIcon(Math.round(24 * scale), lifted);
  }
  written[`${RES}/drawable-xxhdpi/splash_icon.png`] = await sharp(rounded).resize(288, 288).png(PNG).toBuffer();
  written[`${RES}/drawable/ic_launcher_background.xml`] = Buffer.from(`<?xml version="1.0" encoding="utf-8"?>
<!-- The icon's green (scripts/brand.mjs), behind the adaptive icon's mark. -->
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <gradient android:angle="315" android:startColor="${lifted.green[0]}" android:endColor="${lifted.green[1]}" />
</shape>
`);
}

for (const [file, bytes] of Object.entries(written)) {
  fs.mkdirSync(file.slice(0, file.lastIndexOf("/")), { recursive: true });
  fs.writeFileSync(file, bytes);
}
console.log(
  Object.entries(written)
    .map(([file, bytes]) => `${file}: ${Math.round(bytes.length / 1024)} KB`)
    .join("\n"),
);
