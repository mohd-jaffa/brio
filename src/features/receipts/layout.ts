import type { BillDocument } from "./document";
import type { BillColor } from "./palette";

/** The four faces the image and the PDF draw in (public/fonts/bill). */
export type BillFace = "serif" | "sans" | "sansBold" | "sansItalic";

/** How wide a run of text is in a face at a size — the canvas's or pdfkit's own reading. */
export type Measure = (text: string, face: BillFace, size: number) => number;

export type BillOp =
  /** `y` is the baseline. */
  | { kind: "text"; x: number; y: number; text: string; face: BillFace; size: number; color: BillColor; link?: string }
  | {
      kind: "rule";
      x: number;
      y: number;
      width: number;
      weight: number;
      color: BillColor;
      style: "solid" | "dashed" | "dotted";
    }
  /** The estimate's band, the theme's colour at a tenth. */
  | { kind: "band"; x: number; y: number; width: number; height: number; radius: number }
  /** The business's logo in a round frame, or the cake mark where it has none. */
  | { kind: "mark"; x: number; y: number; size: number };

export interface BillLayout {
  width: number;
  height: number;
  ops: BillOp[];
  /** Heights between blocks, where a PDF page may end without cutting through a line. */
  breaks: number[];
}

/** Receipt width, in points — a pixel at 1× on the canvas. The PDF scales it to A5. */
export const BILL_WIDTH = 360;
const PAD = 24;
const INNER = BILL_WIDTH - PAD * 2;
const MARK = 56;
const LABEL_COLUMN = 84;
const GAP = 12;

const leading = (size: number) => Math.round(size * 1.45);
/** Where a line's baseline sits below the top of its line box. */
const baseline = (size: number) => Math.round(size * 1.05);

/**
 * Breaks text into lines no wider than `width`: at the line breaks it has
 * (an address typed on several lines), then between words, and inside a word
 * only when one word alone is too wide.
 */
export function wrap(text: string, face: BillFace, size: number, width: number, measure: Measure): string[] {
  const fits = (candidate: string) => measure(candidate, face, size) <= width;
  const lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (fits(candidate)) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      line = "";
      // A word wider than the line is cut where it must be.
      let rest = word;
      while (rest.length > 1 && !fits(rest)) {
        let cut = rest.length - 1;
        while (cut > 1 && !fits(rest.slice(0, cut))) cut -= 1;
        lines.push(rest.slice(0, cut));
        rest = rest.slice(cut);
      }
      line = rest;
    }
    if (line) lines.push(line);
  }
  return lines;
}

/**
 * Where everything on the bill goes, in the order the on-screen bill shows
 * it (./components/BillView): the business, the bill's heading, for whom,
 * the lines, the totals and the footer. Only positions — the image and the
 * PDF each paint the result, so they cannot drift apart. Links are drawn
 * only where they can be followed: in the PDF, not the image.
 */
export function layoutBill(document: BillDocument, measure: Measure, options: { links: boolean }): BillLayout {
  const ops: BillOp[] = [];
  const breaks: number[] = [];
  let y = PAD;

  /** Lines of text from `x`, top at the current height; moves down past them. */
  const block = (
    text: string,
    face: BillFace,
    size: number,
    color: BillColor,
    x = PAD,
    width = INNER,
    link?: string,
  ) => {
    for (const line of wrap(text, face, size, width, measure)) {
      ops.push({ kind: "text", x, y: y + baseline(size), text: line, face, size, color, ...(link ? { link } : {}) });
      y += leading(size);
    }
  };

  const rule = (style: "solid" | "dashed" | "dotted", color: BillColor = "rule", weight = 1) =>
    ops.push({ kind: "rule", x: PAD, y, width: INNER, weight, color, style });

  /** A label on the left and an amount on the right, sharing the first baseline. */
  const row = (
    label: string,
    labelFace: BillFace,
    labelColor: BillColor,
    amount: string,
    amountFace: BillFace,
    amountSize: number,
    amountColor: BillColor,
  ) => {
    const size = 12.5;
    const amountWidth = measure(amount, amountFace, amountSize);
    const top = y;
    const lineHeight = Math.max(leading(size), leading(amountSize));
    const first = top + Math.max(baseline(size), baseline(amountSize));
    ops.push({
      kind: "text",
      x: PAD + INNER - amountWidth,
      y: first,
      text: amount,
      face: amountFace,
      size: amountSize,
      color: amountColor,
    });
    const lines = wrap(label, labelFace, size, INNER - amountWidth - GAP, measure);
    lines.forEach((line, index) => {
      ops.push({
        kind: "text",
        x: PAD,
        y: first + index * leading(size),
        text: line,
        face: labelFace,
        size,
        color: labelColor,
      });
    });
    y = top + lineHeight + (lines.length - 1) * leading(size);
  };

  // The business: its mark, then its name and catch phrase beside it.
  const { business } = document;
  const column = PAD + MARK + 14;
  const columnWidth = BILL_WIDTH - PAD - column;
  const nameLines = wrap(business.name, "serif", 19, columnWidth, measure);
  const taglineLines = business.tagline ? wrap(business.tagline, "sansItalic", 12, columnWidth, measure) : [];
  const columnHeight =
    nameLines.length * leading(19) + (taglineLines.length > 0 ? 3 + taglineLines.length * leading(12) : 0);
  const headerHeight = Math.max(MARK, columnHeight);
  ops.push({ kind: "mark", x: PAD, y: y + (headerHeight - MARK) / 2, size: MARK });
  const top = y;
  y += (headerHeight - columnHeight) / 2;
  block(business.name, "serif", 19, "ink", column, columnWidth);
  if (business.tagline) {
    y += 3;
    block(business.tagline, "sansItalic", 12, "muted", column, columnWidth);
  }
  y = top + headerHeight + 16;

  // The header rule, in the theme's colour, then how to reach the business.
  rule("solid", "accent", 2);
  y += 12;
  for (const line of business.contact) block(line, "sans", 12, "muted");
  y += 12;
  breaks.push(y);
  rule("dashed", "muted");
  y += 16;

  // Which bill: its number and date, or the estimate's band.
  const { heading } = document;
  const label = (heading.note ? `${heading.label} · ${heading.note}` : heading.label).toUpperCase();
  if (heading.note) {
    ops.push({ kind: "band", x: PAD - 8, y: y - 8, width: INNER + 16, height: leading(13) + 16, radius: 8 });
  }
  const date = heading.date;
  const dateWidth = measure(date, "sans", 12);
  const headingBaseline = y + baseline(13);
  ops.push({
    kind: "text",
    x: PAD,
    y: headingBaseline,
    text: label,
    face: "sansBold",
    size: 10.5,
    color: heading.note ? "accent" : "muted",
  });
  if (heading.number) {
    ops.push({
      kind: "text",
      x: PAD + measure(label, "sansBold", 10.5) + 8,
      y: headingBaseline,
      text: heading.number,
      face: "sansBold",
      size: 13,
      color: "ink",
    });
  }
  ops.push({
    kind: "text",
    x: PAD + INNER - dateWidth,
    y: headingBaseline,
    text: date,
    face: "sans",
    size: 12,
    color: "muted",
  });
  y += leading(13) + (heading.note ? 16 : 10);

  // For whom, and when and where it is handed over.
  const valueX = PAD + LABEL_COLUMN;
  const valueWidth = INNER - LABEL_COLUMN;
  for (const party of document.parties) {
    const partyTop = y;
    ops.push({
      kind: "text",
      x: PAD,
      y: partyTop + baseline(12),
      text: party.label,
      face: "sans",
      size: 12,
      color: "muted",
    });
    block(party.value, "sans", 12, "ink", valueX, valueWidth);
    for (const detail of party.details) block(detail, "sans", 12, "muted", valueX, valueWidth);
    if (party.link && options.links) {
      const linkBaseline = y + baseline(12);
      block(party.link.label, "sansBold", 12, "ink", valueX, valueWidth, party.link.href);
      ops.push({
        kind: "rule",
        x: valueX,
        y: linkBaseline + 2,
        width: measure(party.link.label, "sansBold", 12),
        weight: 0.75,
        color: "ink",
        style: "solid",
      });
    }
    y = Math.max(y, partyTop + leading(12)) + 6;
  }
  y += 6;
  breaks.push(y);
  rule("dashed", "muted");
  y += 16;

  // What was ordered.
  document.lines.forEach((line, index) => {
    if (index > 0) {
      y += 12;
      breaks.push(y - 6);
    }
    block(line.name, "sansBold", 13, "ink");
    row(line.detail, "sans", "muted", line.amount, "sansBold", 13, "ink");
    if (line.note) block(line.note, "sansItalic", 12, "muted");
  });
  y += 14;
  breaks.push(y);
  rule("solid");
  y += 14;

  // What it comes to.
  for (const total of document.totals) {
    if (total.emphasis === "total") {
      y += 2;
      rule("solid");
      y += 10;
      row(total.label, "sansBold", "ink", total.amount, "serif", 22, "accent");
    } else if (total.emphasis === "strong") {
      row(total.label, "sansBold", "ink", total.amount, "sansBold", 12.5, "ink");
    } else {
      row(total.label, "sans", "muted", total.amount, "sans", 12.5, "ink");
    }
    y += 4;
  }
  y += 12;
  breaks.push(y);
  rule("dotted", "muted");
  y += 18;

  // Thanks, and the app's credit.
  const thanksWidth = measure(document.thanks, "sans", 13);
  ops.push({
    kind: "text",
    x: (BILL_WIDTH - thanksWidth) / 2,
    y: y + baseline(13),
    text: document.thanks,
    face: "sans",
    size: 13,
    color: "ink",
  });
  y += leading(13) + 2;
  const { footer } = document;
  const separator = footer.host ? " · " : "";
  const runs = [footer.credit + separator, footer.host ?? ""];
  const runWidths = runs.map((run) => measure(run, "sans", 10));
  let x = (BILL_WIDTH - runWidths[0] - runWidths[1]) / 2;
  const footerBaseline = y + baseline(10);
  ops.push({ kind: "text", x, y: footerBaseline, text: runs[0], face: "sans", size: 10, color: "muted" });
  if (footer.host) {
    x += runWidths[0];
    const link = options.links && footer.href ? { link: footer.href } : {};
    ops.push({
      kind: "text",
      x,
      y: footerBaseline,
      text: footer.host,
      face: "sans",
      size: 10,
      color: "muted",
      ...link,
    });
    if (options.links && footer.href) {
      ops.push({
        kind: "rule",
        x,
        y: footerBaseline + 1.5,
        width: runWidths[1],
        weight: 0.5,
        color: "muted",
        style: "solid",
      });
    }
  }
  y += leading(10);

  return { width: BILL_WIDTH, height: Math.ceil(y + PAD), ops, breaks };
}
