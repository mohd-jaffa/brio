// Fetches the faces the bill's image and PDF are drawn in (plan §139.11.6):
//
//   public/fonts/bill/{Inter-Regular,Inter-SemiBold,Inter-Italic,Fraunces-Medium}.ttf
//
// The app's own two faces, as static TrueType from Google Fonts — the PDF
// needs TrueType, and a static weight is drawn the same by the browser's
// canvas and by pdfkit. Each is cut to Latin with Latin Extended, the general
// punctuation and ₹, so the four together stay under 300 KB. Both are under
// the SIL Open Font License (OFL-Inter.txt, OFL-Fraunces.txt beside them).
//
//   node scripts/bill-fonts.mjs
import fs from "node:fs";

const OUT = "public/fonts/bill";
const RANGES = [
  [0x20, 0x7e],
  [0xa0, 0x24f],
  [0x2010, 0x2027],
  [0x2030, 0x203a],
  [0x20ac, 0x20ac],
  [0x20b9, 0x20b9],
  [0x2122, 0x2122],
  [0x2212, 0x2212],
];
const FACES = {
  "Inter-Regular": "Inter:wght@400",
  "Inter-SemiBold": "Inter:wght@600",
  "Inter-Italic": "Inter:ital,wght@1,400",
  "Fraunces-Medium": "Fraunces:wght@500",
};

const text = RANGES.flatMap(([from, to]) =>
  Array.from({ length: to - from + 1 }, (_, index) => String.fromCodePoint(from + index)),
).join("");

for (const [file, family] of Object.entries(FACES)) {
  const url = `https://fonts.googleapis.com/css2?family=${family}&text=${encodeURIComponent(text)}`;
  // An agent Google does not know is answered with TrueType.
  const css = await (await fetch(url, { headers: { "User-Agent": "curl/8" } })).text();
  const source = /src:\s*url\(([^)]+)\)\s*format\('truetype'\)/.exec(css)?.[1];
  if (!source) throw new Error(`No TrueType for ${family}`);
  const bytes = Buffer.from(await (await fetch(source)).arrayBuffer());
  fs.writeFileSync(`${OUT}/${file}.ttf`, bytes);
  console.log(`${file}.ttf  ${(bytes.length / 1024).toFixed(0)} KB`);
}
