// Builds the installed app's icons (plan §139.19 R7.1) from the brand mark
// (src/features/auth/components/BrandMark.tsx), drawn in cream on Golden's
// caramel, which is the app's own colour wherever it is installed:
//
//   public/icons/icon-192.png, icon-512.png   the manifest's icons ("any")
//   public/icons/icon-maskable-512.png        Android's shaped icon: the mark
//                                              inside the middle 60 %, so no
//                                              mask shape can cut it
//   src/app/apple-icon.png                    iOS's home-screen icon (180 px);
//                                              Next links it itself
//
//   node scripts/app-icons.mjs
import fs from "node:fs";

import sharp from "sharp";

const CARAMEL = "#7a4a25";
const CREAM = "#fff8f0";

// The mark's own drawing, in its 52 × 58 box: a seed, a stem, two pairs of leaves.
const MARK = `
  <path d="M26 3.5c5.5 6.4 5.5 14.4 0 20.8-5.5-6.4-5.5-14.4 0-20.8Z" />
  <circle cx="26" cy="12.6" r="2.1" />
  <path d="M26 24.3V53" />
  <path d="M25.2 28.6c-7.9-4.4-15.8-2-19.6 5.6 8 4.4 15.9 2 19.6-5.6Z" />
  <path d="M26.8 28.6c7.9-4.4 15.8-2 19.6 5.6-8 4.4-15.9 2-19.6-5.6Z" />
  <path d="M25.3 40.2c-5.6-3.1-11.2-1.4-13.9 4 5.7 3.1 11.3 1.4 13.9-4Z" />
  <path d="M26.7 40.2c5.6-3.1 11.2-1.4 13.9 4-5.7 3.1-11.3 1.4-13.9-4Z" />`;

/** The mark centred on a caramel square, `share` of the square's height tall. */
function icon(size, share) {
  const height = size * share;
  const width = height * (52 / 58);
  const x = (size - width) / 2;
  const y = (size - height) / 2;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${CARAMEL}" />
  <svg x="${x}" y="${y}" width="${width}" height="${height}" viewBox="0 0 52 58" fill="none" stroke="${CREAM}"
       stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${MARK}</svg>
</svg>`);
}

const OUT = "public/icons";
fs.mkdirSync(OUT, { recursive: true });
const builds = [
  [`${OUT}/icon-192.png`, 192, 0.62],
  [`${OUT}/icon-512.png`, 512, 0.62],
  [`${OUT}/icon-maskable-512.png`, 512, 0.5],
  ["src/app/apple-icon.png", 180, 0.62],
];
for (const [file, size, share] of builds) {
  await sharp(icon(size, share)).png({ compressionLevel: 9 }).toFile(file);
}
console.log(`Wrote ${builds.length} icons.`);
