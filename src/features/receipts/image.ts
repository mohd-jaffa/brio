import { ERROR_MESSAGES } from "@/constants/messages";
import type { Theme } from "@/lib/theme/themes";

import { billFileName } from "./bill";
import { billDocument } from "./document";
import { BILL_FONT_DIRECTORY, BILL_FONT_FILES, CAKE_MARK, CAKE_SCALE, LOGO_INSET, RULE_DASHES } from "./drawing";
import { layoutBill, type BillFace, type BillLayout, type Measure } from "./layout";
import { billColor } from "./palette";
import type { Bill } from "./types";

/**
 * The bill as a PNG (plan §139.11.6): WhatsApp shows an image inline, so it
 * is what Share sends. Drawn in the browser on a canvas from the same layout
 * the PDF uses, at up to 3× for a sharp image on any phone, and never stored.
 */

/** The family each face is registered under, apart from the page's own fonts. */
const FAMILIES: Record<BillFace, string> = {
  serif: "Brio Bill Serif",
  sans: "Brio Bill Sans",
  sansBold: "Brio Bill Sans Bold",
  sansItalic: "Brio Bill Sans Italic",
};

/** iOS will not draw a canvas larger than this many pixels. */
const MAX_PIXELS = 16_000_000;
const SCALE = 3;

const fontOf = (face: BillFace, size: number) => `${size}px "${FAMILIES[face]}"`;

export interface Surface {
  context: CanvasRenderingContext2D;
  toBlob(): Promise<Blob>;
}

/** What drawing needs from the browser, so a test can stand in for it. */
export interface Drawing {
  loadFonts(): Promise<void>;
  createSurface(width: number, height: number): Surface;
  /** The logo, ready to draw — or null, and the cake mark is drawn instead. */
  loadImage(url: string): Promise<CanvasImageSource | null>;
}

export function paintBill(
  context: CanvasRenderingContext2D,
  layout: BillLayout,
  { scale, theme, logo }: { scale: number; theme: Theme; logo: CanvasImageSource | null },
) {
  const color = (role: Parameters<typeof billColor>[0]) => billColor(role, theme);
  context.scale(scale, scale);
  context.fillStyle = color("paper");
  context.fillRect(0, 0, layout.width, layout.height);

  for (const op of layout.ops) {
    context.save();
    switch (op.kind) {
      case "text":
        context.font = fontOf(op.face, op.size);
        context.fillStyle = color(op.color);
        context.fillText(op.text, op.x, op.y);
        break;
      case "rule":
        context.strokeStyle = color(op.color);
        context.lineWidth = op.weight;
        context.lineCap = op.style === "dotted" ? "round" : "butt";
        context.setLineDash([...RULE_DASHES[op.style]]);
        context.beginPath();
        context.moveTo(op.x, op.y);
        context.lineTo(op.x + op.width, op.y);
        context.stroke();
        break;
      case "band":
        context.globalAlpha = 0.1;
        context.fillStyle = color("accent");
        context.beginPath();
        context.roundRect(op.x, op.y, op.width, op.height, op.radius);
        context.fill();
        break;
      case "mark":
        paintMark(context, op, logo, color);
        break;
    }
    context.restore();
  }
}

function paintMark(
  context: CanvasRenderingContext2D,
  { x, y, size }: { x: number; y: number; size: number },
  logo: CanvasImageSource | null,
  color: (role: Parameters<typeof billColor>[0]) => string,
) {
  const radius = size / 2;
  const circle = (inset: number) => {
    context.beginPath();
    context.arc(x + radius, y + radius, radius - inset, 0, Math.PI * 2);
  };

  if (!logo) {
    circle(0);
    context.fillStyle = color("accent");
    context.fill();
    const icon = size * CAKE_SCALE;
    context.translate(x + (size - icon) / 2, y + (size - icon) / 2);
    context.scale(icon / CAKE_MARK.grid, icon / CAKE_MARK.grid);
    context.strokeStyle = color("paper");
    context.lineWidth = CAKE_MARK.stroke;
    context.lineCap = "round";
    context.lineJoin = "round";
    for (const path of CAKE_MARK.paths) context.stroke(new Path2D(path));
    return;
  }

  // The logo keeps its own proportions inside the frame: fitted, not cropped.
  circle(0);
  context.fillStyle = color("paper");
  context.fill();
  context.strokeStyle = color("rule");
  context.lineWidth = 1;
  context.stroke();
  circle(LOGO_INSET);
  context.clip();
  const { width, height } = logo as { width: number; height: number };
  const box = size - LOGO_INSET * 2;
  const fit = Math.min(box / width, box / height);
  context.drawImage(logo, x + (size - width * fit) / 2, y + (size - height * fit) / 2, width * fit, height * fit);
}

export async function billImage(bill: Bill, theme: Theme, drawing: Drawing = browserDrawing): Promise<File> {
  const [, logo] = await Promise.all([
    drawing.loadFonts(),
    bill.business.logoUrl ? drawing.loadImage(bill.business.logoUrl) : null,
  ]);
  const measuring = drawing.createSurface(1, 1).context;
  const measure: Measure = (text, face, size) => {
    measuring.font = fontOf(face, size);
    return measuring.measureText(text).width;
  };
  const layout = layoutBill(billDocument(bill), measure, { links: false });
  const scale = Math.min(SCALE, Math.sqrt(MAX_PIXELS / (layout.width * layout.height)));
  const surface = drawing.createSurface(Math.round(layout.width * scale), Math.round(layout.height * scale));
  paintBill(surface.context, layout, { scale, theme, logo });
  return new File([await surface.toBlob()], billFileName(bill, "png"), { type: "image/png" });
}

/** Loaded once a page, and tried again if loading failed. */
let fontsLoading: Promise<void> | null = null;

export const browserDrawing: Drawing = {
  loadFonts() {
    fontsLoading ??= Promise.all(
      (Object.keys(BILL_FONT_FILES) as BillFace[]).map(async (face) => {
        const font = new FontFace(FAMILIES[face], `url(/${BILL_FONT_DIRECTORY}/${BILL_FONT_FILES[face]})`);
        document.fonts.add(await font.load());
      }),
    ).then(
      () => undefined,
      (failure: unknown) => {
        fontsLoading = null;
        throw failure;
      },
    );
    return fontsLoading;
  },

  createSurface(width, height) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error(ERROR_MESSAGES.BILL_SHARE_FAILED);
    return {
      context,
      toBlob: () =>
        new Promise((resolve, reject) =>
          canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error(ERROR_MESSAGES.BILL_SHARE_FAILED))),
            "image/png",
          ),
        ),
    };
  },

  async loadImage(url) {
    try {
      const response = await fetch(url);
      return response.ok ? await createImageBitmap(await response.blob()) : null;
    } catch {
      return null;
    }
  },
};

/** Only for tests: forgets the fonts, as a new page would. */
export function resetBillFonts() {
  fontsLoading = null;
}
