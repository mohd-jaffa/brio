import { describe, expect, it } from "vitest";

import { formatQuantity } from "@/lib/format/quantity";

describe("formatQuantity", () => {
  it("says a count the way it is said", () => {
    expect(formatQuantity(1, "box")).toBe("1 box");
    expect(formatQuantity(6, "box")).toBe("6 boxes");
    expect(formatQuantity(5, "piece")).toBe("5 pieces");
    expect(formatQuantity(0, "piece")).toBe("0 pieces");
  });

  it("leaves measures alone", () => {
    expect(formatQuantity(14, "kg")).toBe("14 kg");
    expect(formatQuantity(2, "dozen")).toBe("2 dozen");
  });

  it("groups large counts the Indian way, and keeps a unit it does not know", () => {
    expect(formatQuantity(25000, "gram")).toBe("25,000 grams");
    expect(formatQuantity(3, "tray")).toBe("3 tray");
  });
});
