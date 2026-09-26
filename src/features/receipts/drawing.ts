import type { BillFace } from "./layout";

/**
 * What the image and the PDF both draw with, beyond the layout: the four
 * font files — served from public/ to the browser's canvas and read from
 * disk by pdfkit, so both measure the same faces — and the cake mark that
 * stands in for a missing logo, as it does in the app (BusinessLogo).
 */
export const BILL_FONT_DIRECTORY = "fonts/bill";

export const BILL_FONT_FILES: Record<BillFace, string> = {
  serif: "Fraunces-Medium.ttf",
  sans: "Inter-Regular.ttf",
  sansBold: "Inter-SemiBold.ttf",
  sansItalic: "Inter-Italic.ttf",
};

/** lucide's `cake`, on its 24-unit grid, drawn in strokes 1.75 wide. */
export const CAKE_MARK = {
  grid: 24,
  stroke: 1.75,
  paths: [
    "M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8",
    "M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1",
    "M2 21h20",
    "M7 8v3",
    "M12 8v3",
    "M17 8v3",
    "M7 4h.01",
    "M12 4h.01",
    "M17 4h.01",
  ],
} as const;

/** The cake is half the mark's width, as BusinessLogo draws it (28 in 64). */
export const CAKE_SCALE = 28 / 64;
/** A logo sits inside its round frame with this much room, as `p-0.5` gives it on screen. */
export const LOGO_INSET = 2;

/** Every dash pattern the bill uses, as [dash, gap]. */
export const RULE_DASHES = { solid: [], dashed: [4, 3], dotted: [0.5, 2.5] } as const;
