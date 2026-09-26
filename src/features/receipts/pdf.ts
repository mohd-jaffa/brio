import { readFile } from "node:fs/promises";
import { join } from "node:path";

import PDFDocument from "pdfkit";

import { UI_TEXT } from "@/constants/messages";
import type { Theme } from "@/lib/theme/themes";

import { billFileName } from "./bill";
import { billDocument } from "./document";
import { BILL_FONT_DIRECTORY, BILL_FONT_FILES, CAKE_MARK, CAKE_SCALE, LOGO_INSET, RULE_DASHES } from "./drawing";
import { layoutBill, type BillFace, type BillLayout, type BillOp } from "./layout";
import { billColor, type BillColor } from "./palette";
import type { Bill } from "./types";

/**
 * The bill as a PDF (plan §139.11.6, §133.8 H1): drawn from the same layout
 * as the image, in the same fonts, at receipt width on A5 — shrunk a little
 * to stay on one page, and run on to more only where a long order needs them,
 * never through a line. Made
 * for the request that asks for it and stored nowhere (AGENTS.md §15).
 */

/** A5, in points. */
const PAGE = { width: 419.53, height: 595.28 };
/** Room above what continues on a later page, in layout points. */
const CONTINUED_TOP = 24;
/** A bill is shrunk to this much of its full size to stay on one page, and no further. */
const SMALLEST_FIT = 0.75;

const FACES = Object.keys(BILL_FONT_FILES) as BillFace[];

let fonts: Promise<Record<BillFace, Buffer>> | null = null;

/** Read once a process, from where the browser is served them (public/fonts/bill). */
function loadFonts(): Promise<Record<BillFace, Buffer>> {
  fonts ??= Promise.all(
    FACES.map((face) => readFile(join(process.cwd(), "public", BILL_FONT_DIRECTORY, BILL_FONT_FILES[face]))),
  ).then(
    (files) => Object.fromEntries(FACES.map((face, index) => [face, files[index]])) as Record<BillFace, Buffer>,
    (failure: unknown) => {
      fonts = null;
      throw failure;
    },
  );
  return fonts;
}

/** Page slices of the layout: each ends at the last break that fits, or where the page does if none does. */
export function paginate(layout: Pick<BillLayout, "height" | "breaks">, pageHeight: number): [number, number][] {
  const pages: [number, number][] = [];
  let start = 0;
  while (start < layout.height) {
    const room = pageHeight - (pages.length > 0 ? CONTINUED_TOP : 0);
    let end = Math.min(layout.height, start + room);
    if (end < layout.height) {
      const fits = layout.breaks.filter((at) => at > start && at <= end);
      if (fits.length > 0) end = Math.max(...fits);
    }
    pages.push([start, end]);
    start = end;
  }
  return pages;
}

function paint(document: PDFKit.PDFDocument, op: BillOp, color: (role: BillColor) => string, logo: Buffer | null) {
  document.save();
  switch (op.kind) {
    case "text":
      document
        .font(op.face)
        .fontSize(op.size)
        .fillColor(color(op.color))
        .text(op.text, op.x, op.y, { baseline: "alphabetic", lineBreak: false });
      // Over the words themselves: pdfkit's own `link` option needs the line to wrap.
      if (op.link) document.link(op.x, op.y - op.size, document.widthOfString(op.text), op.size * 1.3, op.link);
      break;
    case "rule":
      document
        .moveTo(op.x, op.y)
        .lineTo(op.x + op.width, op.y)
        .lineWidth(op.weight)
        .strokeColor(color(op.color));
      if (op.style !== "solid") {
        const [dash, space] = RULE_DASHES[op.style];
        document.dash(dash, { space });
      }
      document.lineCap(op.style === "dotted" ? "round" : "butt").stroke();
      break;
    case "band":
      document.roundedRect(op.x, op.y, op.width, op.height, op.radius).fillOpacity(0.1).fill(color("accent"));
      break;
    case "mark": {
      const radius = op.size / 2;
      const [cx, cy] = [op.x + radius, op.y + radius];
      if (!logo) {
        document.circle(cx, cy, radius).fill(color("accent"));
        const icon = op.size * CAKE_SCALE;
        document.translate(op.x + (op.size - icon) / 2, op.y + (op.size - icon) / 2).scale(icon / CAKE_MARK.grid);
        document.lineWidth(CAKE_MARK.stroke).lineCap("round").lineJoin("round").strokeColor(color("paper"));
        for (const path of CAKE_MARK.paths) document.path(path).stroke();
        break;
      }
      document.circle(cx, cy, radius).lineWidth(1).fillAndStroke(color("paper"), color("rule"));
      document.circle(cx, cy, radius - LOGO_INSET).clip();
      const box = op.size - LOGO_INSET * 2;
      document.image(logo, op.x + LOGO_INSET, op.y + LOGO_INSET, {
        fit: [box, box],
        align: "center",
        valign: "center",
      });
      break;
    }
  }
  document.restore();
}

/**
 * `logo` is the business's logo as PNG or JPEG — the two a PDF can hold —
 * or null for the cake mark.
 */
export async function billPdf(bill: Bill, { theme, logo }: { theme: Theme; logo: Buffer | null }): Promise<Buffer> {
  const faces = await loadFonts();
  const title = billFileName(bill, "pdf").replace(/\.pdf$/, "");
  const document = new PDFDocument({
    autoFirstPage: false,
    // No built-in font: every face is the app's own, so nothing is read from pdfkit's data folder.
    font: null as unknown as string,
    info: { Title: title, Author: bill.business.name, Creator: UI_TEXT.appName },
  });
  for (const face of FACES) document.registerFont(face, faces[face]);

  const measure = (text: string, face: BillFace, size: number) =>
    document.font(face).fontSize(size).widthOfString(text);
  const layout = layoutBill(billDocument(bill), measure, { links: true });
  // Receipt width at its own size, centred on the page — never blown up to fill it.
  const scale = Math.min(1, PAGE.width / layout.width);
  const color = (role: BillColor) => billColor(role, theme);

  const chunks: Buffer[] = [];
  document.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve, reject) => {
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);
  });

  // A bill a little taller than the page is set a little smaller, on one
  // page; only a long one runs on to another.
  const fitted = PAGE.height / layout.height;
  const onePage = fitted >= scale * SMALLEST_FIT;
  const drawn = onePage ? Math.min(scale, fitted) : scale;
  const left = (PAGE.width - layout.width * drawn) / 2;
  const pages: [number, number][] = onePage ? [[0, layout.height]] : paginate(layout, PAGE.height / scale);

  pages.forEach(([start, end], index) => {
    document.addPage({ size: [PAGE.width, PAGE.height], margin: 0 });
    document.save();
    document
      .translate(left, 0)
      .scale(drawn)
      .translate(0, -start + (index > 0 ? CONTINUED_TOP : 0));
    for (const op of layout.ops) {
      if (op.y >= start && op.y < end) paint(document, op, color, logo);
    }
    document.restore();
  });
  document.end();
  return done;
}

/** Only for tests: forgets the fonts, as a new process would. */
export function resetBillPdfFonts() {
  fonts = null;
}
