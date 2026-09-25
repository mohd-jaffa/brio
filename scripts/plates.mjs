// Builds the photographic plates (plan §139.11.12, R1.13) from the supplied
// photographs in design-references/ — which stay uncommitted — into
// src/assets/plates/, which is committed. Run it only where the references are.
//
// The two heroes carry a headline printed into their left side, so only their
// right-hand part is taken, clear of the type.
import fs from "node:fs";
import path from "node:path";

import sharp from "sharp";

const SOURCE = "design-references";
const OUT = "src/assets/plates";
const MAX_BYTES = 200 * 1024;

const PLATES = [
  { name: "cake-table", file: "v2-plate-cake-clean.png" },
  // The type ends near 46 % of the width; the crop starts at 48 %.
  { name: "drip-cake", file: "v2-hero-cake-with-type.png", fromX: 0.48 },
  { name: "brownies", file: "v2-hero-brownie-with-type.png", fromX: 0.48 },
];

fs.mkdirSync(OUT, { recursive: true });
for (const plate of PLATES) {
  const source = path.join(SOURCE, plate.file);
  if (!fs.existsSync(source)) throw new Error(`${source} is missing: the plates are built from the design references.`);
  const { width, height } = await sharp(source).metadata();
  const left = Math.round(width * (plate.fromX ?? 0));

  let quality = 80;
  let webp;
  do {
    webp = await sharp(source)
      .extract({ left, top: 0, width: width - left, height })
      .webp({ quality, effort: 6 })
      .toBuffer();
    quality -= 4;
  } while (webp.length > MAX_BYTES && quality >= 60);

  if (webp.length > MAX_BYTES) throw new Error(`${plate.name} is over ${MAX_BYTES / 1024} KB even at quality 60.`);
  fs.writeFileSync(path.join(OUT, `${plate.name}.webp`), webp);
  const { width: w, height: h } = await sharp(webp).metadata();
  console.log(`${plate.name}: ${w} × ${h}, ${Math.round(webp.length / 1024)} KB at quality ${quality + 4}`);
}
