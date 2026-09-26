// @vitest-environment node
// pdfkit checks its buffers against Node's own Uint8Array, which jsdom replaces.
import sharp from "sharp";
import { afterEach, describe, expect, it, vi } from "vitest";

const readFile = vi.hoisted(() => vi.fn());
vi.mock("node:fs/promises", async (original) => {
  const real = await original<typeof import("node:fs/promises")>();
  readFile.mockImplementation(real.readFile);
  return { ...real, readFile };
});

import { billPdf, paginate, resetBillPdfFonts } from "@/features/receipts/pdf";

import { aBill, aBusiness } from "@tests/support/bills";

afterEach(() => resetBillPdfFonts());

const noLogo = aBusiness({ logoUrl: null });
const pages = (pdf: Buffer) => pdf.toString("latin1").match(/\/Type \/Page\b/g)?.length ?? 0;
const lines = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    name: `Box of brownies ${index + 1}`,
    quantity: 2,
    unitPrice: 38_000,
    subtotal: 76_000,
    note: index % 3 === 0 ? "Less sugar" : null,
  }));

describe("paginate", () => {
  it("ends each page at the last break that fits, and leaves room atop the next", () => {
    expect(paginate({ height: 1000, breaks: [300, 450, 700, 900] }, 500)).toEqual([
      [0, 450],
      [450, 900],
      [900, 1000],
    ]);
  });

  it("cuts where the page ends when no break fits, and is one page when all of it does", () => {
    expect(paginate({ height: 900, breaks: [] }, 500)).toEqual([
      [0, 500],
      [500, 900],
    ]);
    expect(paginate({ height: 400, breaks: [200] }, 500)).toEqual([[0, 400]]);
  });
});

describe("billPdf (§139.11.6, §133.8 H1)", () => {
  it("is an A5 PDF on one page, titled and linked, in the app's own fonts", async () => {
    const pdf = await billPdf(aBill({ business: noLogo }), { theme: "golden", logo: null });
    const raw = pdf.toString("latin1");

    expect(raw.startsWith("%PDF")).toBe(true);
    expect(pages(pdf)).toBe(1);
    expect(raw).toContain("/MediaBox [0 0 419.53 595.28]");
    expect(raw).toMatch(/\/URI \(https:\/\/maps\.app\.goo\.gl\/meena\)/);
    expect(raw).toMatch(/\/URI \(https:\/\/ovenly\.app\)/);
    expect(raw).toContain("Inter");
    expect(raw).toContain("Fraunces");
    expect(raw).not.toContain("Helvetica");
  });

  it("runs a long order on to more pages, and draws the logo it is given", async () => {
    const logo = await sharp({ create: { width: 8, height: 8, channels: 3, background: "#7a4a25" } })
      .png()
      .toBuffer();
    const pdf = await billPdf(aBill({ lines: lines(40) }), { theme: "peach", logo });
    expect(pages(pdf)).toBeGreaterThan(1);
    expect(pdf.toString("latin1")).toContain("/Subtype /Image");
  });

  it("sets an estimate's band at a tenth of the theme's colour", async () => {
    const pdf = await billPdf(aBill({ kind: "ESTIMATE", orderNumber: null, business: noLogo }), {
      theme: "peach",
      logo: null,
    });
    expect(pdf.toString("latin1")).toMatch(/\/ca 0\.1\b/);
  });

  it("reads its fonts once, and again after a failed read", async () => {
    readFile.mockRejectedValueOnce(new Error("missing"));
    await expect(billPdf(aBill({ business: noLogo }), { theme: "golden", logo: null })).rejects.toThrow("missing");

    const reads = readFile.mock.calls.length;
    await billPdf(aBill({ business: noLogo }), { theme: "golden", logo: null });
    await billPdf(aBill({ business: noLogo }), { theme: "golden", logo: null });
    expect(readFile.mock.calls.length - reads).toBe(4);
  });
});
