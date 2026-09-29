import { describe, expect, it } from "vitest";

import { VALIDATION_MESSAGES } from "@/constants/messages";

import { createProductSchema, PRODUCT_UNITS, productFormSchema } from "@/lib/validation/index";

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

describe("product units and the form's picture", () => {
  it("sells by the neutral units too — set, bunch and pack (Q8)", () => {
    expect(PRODUCT_UNITS).toEqual(["piece", "kg", "gram", "box", "dozen", "set", "bunch", "pack"]);
    const form = { name: "Roses", description: "", defaultPrice: "300", isActive: true };
    expect(productFormSchema.parse({ ...form, unit: "bunch" }).unit).toBe("bunch");
    expect(productFormSchema.safeParse({ ...form, unit: "litre" }).error?.issues[0].message).toBe(
      VALIDATION_MESSAGES.chooseOne("unit"),
    );
  });

  it("carries the picture chosen, or none for the default", () => {
    const form = { name: "Roses", description: "", defaultPrice: "300", unit: "bunch", isActive: true } as const;
    expect(productFormSchema.parse({ ...form, iconKey: "rose-bunch" }).iconKey).toBe("rose-bunch");
    expect(productFormSchema.parse({ ...form, iconKey: null }).iconKey).toBeNull();
  });

  it("no longer knows a category", () => {
    expect("categoryId" in createProductSchema.shape).toBe(false);
  });
});
