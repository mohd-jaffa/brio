import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { browserDrawing, billImage, paintBill, resetBillFonts, type Drawing } from "@/features/receipts/image";
import type { BillLayout } from "@/features/receipts/layout";
import { BILL_ACCENT, BILL_PAPER } from "@/features/receipts/palette";

import { aBill, aBusiness } from "@tests/support/bills";

/** A 2D context that remembers every call and every property set, in order. */
function recorder() {
  const calls: [string, ...unknown[]][] = [];
  const context = new Proxy({} as Record<string, unknown>, {
    get: (_target, name: string) =>
      name === "measureText"
        ? (text: string) => ({ width: text.length * 6 })
        : (...args: unknown[]) => calls.push([name, ...args]),
    set: (_target, name: string, value) => {
      calls.push([`=${name}`, value]);
      return true;
    },
  });
  return { context: context as unknown as CanvasRenderingContext2D, calls };
}

class FakePath {
  constructor(readonly d: string) {}
}

beforeEach(() => {
  vi.stubGlobal("Path2D", FakePath);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  resetBillFonts();
});

const layout = (ops: BillLayout["ops"]): BillLayout => ({ width: 360, height: 400, ops, breaks: [] });

describe("paintBill", () => {
  it("paints the paper, then each piece in its face and the theme's colours", () => {
    const { context, calls } = recorder();
    paintBill(
      context,
      layout([
        { kind: "text", x: 24, y: 40, text: "₹1,280", face: "serif", size: 22, color: "accent" },
        { kind: "rule", x: 24, y: 60, width: 312, weight: 1, color: "muted", style: "dashed" },
        { kind: "rule", x: 24, y: 70, width: 312, weight: 1, color: "muted", style: "dotted" },
        { kind: "band", x: 16, y: 80, width: 328, height: 34, radius: 8 },
      ]),
      { scale: 3, theme: "peach", logo: null },
    );
    expect(calls[0]).toEqual(["scale", 3, 3]);
    expect(calls).toContainEqual(["fillRect", 0, 0, 360, 400]);
    expect(calls).toContainEqual(["=font", '22px "Brio Bill Serif"']);
    expect(calls).toContainEqual(["=fillStyle", BILL_ACCENT.peach]);
    expect(calls).toContainEqual(["fillText", "₹1,280", 24, 40]);
    expect(calls).toContainEqual(["setLineDash", [4, 3]]);
    expect(calls).toContainEqual(["=lineCap", "round"]);
    expect(calls).toContainEqual(["=globalAlpha", 0.1]);
    expect(calls).toContainEqual(["roundRect", 16, 80, 328, 34, 8]);
  });

  it("draws the cake mark where there is no logo, and a logo fitted inside its frame", () => {
    const cake = recorder();
    paintBill(cake.context, layout([{ kind: "mark", x: 24, y: 24, size: 56 }]), {
      scale: 1,
      theme: "golden",
      logo: null,
    });
    expect(cake.calls).toContainEqual(["=fillStyle", BILL_ACCENT.golden]);
    expect(cake.calls.filter(([name]) => name === "stroke")).toHaveLength(9);

    const framed = recorder();
    const wide = { width: 200, height: 100 } as unknown as CanvasImageSource;
    paintBill(framed.context, layout([{ kind: "mark", x: 24, y: 24, size: 56 }]), {
      scale: 1,
      theme: "golden",
      logo: wide,
    });
    expect(framed.calls).toContainEqual(["=strokeStyle", BILL_PAPER.rule]);
    expect(framed.calls).toContainEqual(["clip"]);
    // 52 wide and 26 high, centred in the 56-point frame.
    expect(framed.calls).toContainEqual(["drawImage", wide, 26, 39, 52, 26]);
  });
});

describe("billImage", () => {
  function drawing(overrides: Partial<Drawing> = {}) {
    const surfaces: { width: number; height: number; calls: unknown[] }[] = [];
    const fake: Drawing = {
      loadFonts: vi.fn().mockResolvedValue(undefined),
      loadImage: vi.fn().mockResolvedValue(null),
      createSurface: (width, height) => {
        const { context, calls } = recorder();
        surfaces.push({ width, height, calls });
        return { context, toBlob: async () => new Blob(["png"], { type: "image/png" }) };
      },
      ...overrides,
    };
    return { fake, surfaces };
  }

  it("is a PNG named for the order and the business, three times the receipt's size", async () => {
    const { fake, surfaces } = drawing();
    const file = await billImage(aBill(), "golden", fake);
    expect(file.name).toBe("ORD-1006 - Sweet Delights Home Bakery.png");
    expect(file.type).toBe("image/png");
    expect(fake.loadImage).toHaveBeenCalledWith("/api/business/logo?v=logo-1");
    expect(surfaces[1].width).toBe(1080);
  });

  it("asks for no logo where there is none, and keeps a long bill within what a phone will draw", async () => {
    const { fake, surfaces } = drawing();
    const lines = Array.from({ length: 300 }, (_, index) => ({
      name: `Item ${index}`,
      quantity: 1,
      unitPrice: 100,
      subtotal: 100,
      note: null,
    }));
    await billImage(aBill({ business: aBusiness({ logoUrl: null }), lines }), "golden", fake);
    expect(fake.loadImage).not.toHaveBeenCalled();
    expect(surfaces[1].width * surfaces[1].height).toBeLessThanOrEqual(
      16_000_000 + 2 * (surfaces[1].width + surfaces[1].height),
    );
    expect(surfaces[1].width).toBeLessThan(1080);
  });
});

describe("browserDrawing", () => {
  it("loads the four faces once a page, and again after a failure", async () => {
    const loaded: string[] = [];
    let fail = true;
    vi.stubGlobal(
      "FontFace",
      class {
        constructor(
          readonly family: string,
          readonly source: string,
        ) {}
        async load() {
          if (fail) throw new Error("offline");
          loaded.push(this.source);
          return this;
        }
      },
    );
    Object.defineProperty(document, "fonts", { value: { add: vi.fn() }, configurable: true });

    await expect(browserDrawing.loadFonts()).rejects.toThrow("offline");
    fail = false;
    await browserDrawing.loadFonts();
    await browserDrawing.loadFonts();
    expect(loaded).toEqual([
      "url(/fonts/bill/Fraunces-Medium.ttf)",
      "url(/fonts/bill/Inter-Regular.ttf)",
      "url(/fonts/bill/Inter-SemiBold.ttf)",
      "url(/fonts/bill/Inter-Italic.ttf)",
    ]);
  });

  it("draws on a canvas of the size asked, and says so when the canvas cannot be drawn or saved", async () => {
    const context = {} as CanvasRenderingContext2D;
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context as never);
    const toBlob = vi
      .spyOn(HTMLCanvasElement.prototype, "toBlob")
      .mockImplementationOnce((done) => done(new Blob(["png"])))
      .mockImplementationOnce((done) => done(null));

    const surface = browserDrawing.createSurface(1080, 1500);
    expect(surface.context).toBe(context);
    await expect(surface.toBlob()).resolves.toBeInstanceOf(Blob);
    await expect(surface.toBlob()).rejects.toThrow("Could not share this bill.");
    expect(toBlob).toHaveBeenCalledWith(expect.any(Function), "image/png");

    getContext.mockReturnValue(null);
    expect(() => browserDrawing.createSurface(1, 1)).toThrow("Could not share this bill.");
  });

  it("reads the logo as a bitmap, and gives the cake mark its place when it cannot", async () => {
    const bitmap = { width: 64, height: 64 };
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue(bitmap));
    const fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, blob: async () => new Blob(["logo"]) })
      .mockResolvedValueOnce({ ok: false })
      .mockRejectedValueOnce(new TypeError("offline"));
    vi.stubGlobal("fetch", fetch);

    await expect(browserDrawing.loadImage("/api/business/logo?v=1")).resolves.toBe(bitmap);
    await expect(browserDrawing.loadImage("/api/business/logo?v=1")).resolves.toBeNull();
    await expect(browserDrawing.loadImage("/api/business/logo?v=1")).resolves.toBeNull();
  });
});
