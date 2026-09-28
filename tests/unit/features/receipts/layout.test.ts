import { describe, expect, it } from "vitest";

import { billDocument } from "@/features/receipts/document";
import { BILL_WIDTH, layoutBill, wrap, type BillOp, type Measure } from "@/features/receipts/layout";

import { aBill, aBusiness } from "@tests/support/bills";

/** Every character half as wide as the type is tall: plain to reason about. */
const measure: Measure = (text, _face, size) => text.length * size * 0.5;

const texts = (ops: BillOp[]) => ops.flatMap((op) => (op.kind === "text" ? [op] : []));
const textOf = (ops: BillOp[], text: string) => texts(ops).find((op) => op.text === text);
const RIGHT = BILL_WIDTH - 24;

describe("wrap", () => {
  it("keeps to the width between words, and keeps the line breaks that were typed", () => {
    expect(wrap("one two three four", "sans", 10, 50, measure)).toEqual(["one two", "three four"]);
    expect(wrap("Flat 4\nRose Street", "sans", 10, 500, measure)).toEqual(["Flat 4", "Rose Street"]);
    expect(wrap("Flat 4\n\n  \nKochi", "sans", 10, 500, measure)).toEqual(["Flat 4", "Kochi"]);
  });

  it("cuts a word only when it alone is too wide, and never loops on one that cannot fit", () => {
    expect(wrap("abcdefghij", "sans", 10, 20, measure)).toEqual(["abcd", "efgh", "ij"]);
    expect(wrap("ab", "sans", 10, 2, measure)).toEqual(["a", "b"]);
  });
});

describe("layoutBill", () => {
  it("places the bill in the order it reads, amounts against the right edge", () => {
    const { ops, width, height } = layoutBill(billDocument(aBill()), measure, { links: true });
    const order = texts(ops).map((op) => op.text);

    expect(width).toBe(BILL_WIDTH);
    expect(order.indexOf("BILL")).toBeGreaterThan(order.indexOf("+91 98765 43210"));
    expect(order.indexOf("Billed to")).toBeGreaterThan(order.indexOf("BILL"));
    expect(order.indexOf("Red Velvet Cupcakes (Box of 6)")).toBeGreaterThan(order.indexOf("Map link"));
    expect(order.indexOf("Balance due")).toBeGreaterThan(order.indexOf("“Happy birthday, Anu”"));
    expect(order.at(-1)).toBe("brio.app");

    for (const amount of ["₹1,150", "₹1,280", "₹780", "26 Sep 2026"]) {
      const op = textOf(ops, amount)!;
      expect(op.x + measure(op.text, op.face, op.size)).toBeCloseTo(RIGHT);
    }
    expect(textOf(ops, "₹1,280")).toMatchObject({ face: "serif", size: 22, color: "accent" });
    expect(textOf(ops, "Balance due")).toMatchObject({ face: "sansBold" });
    expect(Math.max(...ops.map((op) => op.y))).toBeLessThan(height);
  });

  it("links the map and the footer only where a link can be followed", () => {
    const linked = layoutBill(billDocument(aBill()), measure, { links: true }).ops;
    expect(textOf(linked, "Map link")).toMatchObject({ link: "https://maps.app.goo.gl/meena" });
    expect(textOf(linked, "brio.app")).toMatchObject({ link: "https://brio.app" });

    const flat = layoutBill(billDocument(aBill()), measure, { links: false }).ops;
    expect(textOf(flat, "Map link")).toBeUndefined();
    expect(textOf(flat, "brio.app")).not.toHaveProperty("link");
  });

  it("sets an estimate on a band in the theme's colour, with no number", () => {
    const { ops } = layoutBill(billDocument(aBill({ kind: "ESTIMATE", orderNumber: null })), measure, { links: false });
    expect(ops.some((op) => op.kind === "band")).toBe(true);
    expect(textOf(ops, "ESTIMATE · NOT YET CONFIRMED")).toMatchObject({ color: "accent" });
    expect(textOf(ops, "ORD-1006")).toBeUndefined();
  });

  it("wraps a long label beside its amount, and leaves out what is not there", () => {
    const { ops } = layoutBill(
      billDocument(
        aBill({
          business: aBusiness({ tagline: null }),
          appUrl: "",
          adjustments: [
            { type: "DISCOUNT", name: "A very long festive season discount for our regulars", amount: 5_000 },
          ],
        }),
      ),
      measure,
      { links: true },
    );
    const first = texts(ops).find((op) => op.text.startsWith("A very"))!;
    const next = texts(ops).find((op) => op.x === first.x && op.y > first.y && op.color === "muted")!;
    expect(`${first.text} ${next.text}`).toContain("A very long festive season discount");
    // It wraps short of its amount, which keeps its place on the first line.
    expect(first.x + measure(first.text, first.face, first.size)).toBeLessThan(textOf(ops, "−₹50")!.x);
    expect(textOf(ops, "−₹50")!.y).toBe(first.y);
    expect(textOf(ops, "Cakes for every celebration")).toBeUndefined();
    expect(textOf(ops, "Made with Brio")).toBeDefined();
  });

  it("offers a place to end a page between every block, each lower than the last", () => {
    const { breaks, height } = layoutBill(billDocument(aBill()), measure, { links: true });
    expect(breaks.length).toBeGreaterThanOrEqual(5);
    expect([...breaks].sort((a, b) => a - b)).toEqual(breaks);
    expect(Math.max(...breaks)).toBeLessThan(height);
  });

  it("centres the mark beside a name taller than it", () => {
    const tall = layoutBill(
      billDocument(aBill({ business: aBusiness({ name: "The Very Long Name Of A Home Bakery In Kochi, Kerala" }) })),
      measure,
      { links: false },
    ).ops;
    const mark = tall.find((op) => op.kind === "mark")!;
    expect(mark.y).toBeGreaterThan(24);
  });
});
