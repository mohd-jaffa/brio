import { describe, expect, it } from "vitest";

import { createProductSchema, productFormSchema } from "@/lib/validation/index";


describe("product", () => {
  it("takes its price as whole paise", () => {
    const parsed = createProductSchema.parse({ name: "Brownie", defaultPrice: 8000 });
    expect(parsed.defaultPrice).toBe(8000);
    expect(parsed.unit).toBe("piece");
    expect(parsed.isActive).toBe(true);
  });

  it("refuses a fractional price — money is never a float", () => {
    expect(createProductSchema.safeParse({ name: "Brownie", defaultPrice: 80.5 }).success).toBe(false);
  });

  it("the form takes rupees and hands over paise", () => {
    const parsed = productFormSchema.parse({
      name: "Brownie",
      description: "",
      defaultPrice: "80.50",
      unit: "piece",
      isActive: true,
    });
    expect(parsed.defaultPrice).toBe(8050);
  });
});
