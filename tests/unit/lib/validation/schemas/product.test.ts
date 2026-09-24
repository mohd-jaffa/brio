import { describe, expect, it } from "vitest";

import { VALIDATION_MESSAGES } from "@/constants/messages";

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

describe("a product's illustration", () => {
  const base = { name: "Rose bouquet", defaultPrice: 50000 };

  it("accepts a key from the library, or null for the default", () => {
    expect(createProductSchema.parse({ ...base, iconKey: "rose-bouquet" }).iconKey).toBe("rose-bouquet");
    expect(createProductSchema.parse({ ...base, iconKey: null }).iconKey).toBeNull();
    expect(createProductSchema.parse(base).iconKey).toBeUndefined();
  });

  it("refuses a key the library does not have, in the catalogue's words", () => {
    const result = createProductSchema.safeParse({ ...base, iconKey: "javascript-alert" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(VALIDATION_MESSAGES.chooseOne("picture"));
  });
});
