import { describe, expect, it } from "vitest";
import { z } from "zod";

import { VALIDATION_MESSAGES } from "@/constants/messages";

import {
  amountText,
  firstIssue,
  optionalEmail,
  optionalNumberText,
  optionalText,
  optionalUrl,
  optionalUuid,
  paiseAmount,
  paiseText,
  positiveWholeText,
  quantity,
  requiredEmail,
  requiredText,
  wholeNumberText,
} from "./primitives";

const UUID = "3f2504e0-4f89-11d3-9a0c-0305e82c3301";

function messageOf(schema: z.ZodType, value: unknown): string | null {
  const result = schema.safeParse(value);
  return result.success ? null : firstIssue(result.error);
}

describe("optionalText", () => {
  const schema = optionalText(10, "Notes");

  it("treats missing, blank and null as nothing", () => {
    expect(schema.parse(undefined)).toBeNull();
    expect(schema.parse("")).toBeNull();
    expect(schema.parse("   ")).toBeNull();
    expect(schema.parse(null)).toBeNull();
  });

  it("trims what it keeps", () => {
    expect(schema.parse("  hi  ")).toBe("hi");
  });

  it("refuses more than its column holds", () => {
    expect(messageOf(schema, "x".repeat(11))).toBe(VALIDATION_MESSAGES.tooLong("Notes", 10));
  });

  it("can parse its own output again, as the server does after the client", () => {
    expect(schema.parse(schema.parse("hello"))).toBe("hello");
    expect(schema.parse(schema.parse(""))).toBeNull();
  });
});

describe("optionalEmail", () => {
  const schema = optionalEmail("Email");

  it("accepts an address and leaves a blank one null", () => {
    expect(schema.parse("meena@example.com")).toBe("meena@example.com");
    expect(schema.parse("")).toBeNull();
  });

  it("names the field when the shape is wrong", () => {
    expect(messageOf(schema, "meena@")).toBe(VALIDATION_MESSAGES.email("Email"));
  });
});

describe("optionalUrl", () => {
  const schema = optionalUrl("Google Maps link");

  it("accepts a link and leaves a blank one null", () => {
    expect(schema.parse("https://maps.app.goo.gl/x")).toBe("https://maps.app.goo.gl/x");
    expect(schema.parse("")).toBeNull();
  });

  it("refuses something that is not a link", () => {
    expect(messageOf(schema, "maps dot google")).toBe(VALIDATION_MESSAGES.url("Google Maps link"));
  });

  it("refuses a link that is not a web link — it could run on a shared bill (BUG-13)", () => {
    for (const link of ["javascript:alert(1)", "data:text/html,<script>1</script>", "ftp://files.example.com/x"]) {
      expect(messageOf(schema, link)).toBe(VALIDATION_MESSAGES.url("Google Maps link"));
    }
    expect(schema.parse("http://maps.example.com/pin")).toBe("http://maps.example.com/pin");
  });
});

describe("optionalUuid", () => {
  const schema = optionalUuid("Category");

  it("accepts an id and leaves an unset one null", () => {
    expect(schema.parse(UUID)).toBe(UUID);
    expect(schema.parse("")).toBeNull();
  });

  it("refuses something that is not an id", () => {
    expect(messageOf(schema, "category-1")).toBe(VALIDATION_MESSAGES.invalid);
  });
});

describe("amountText", () => {
  const schema = amountText("Amount");

  it("reads a typed amount as a number", () => {
    expect(schema.parse("499.50")).toBe(499.5);
  });

  it("says a blank field is missing, not malformed", () => {
    expect(messageOf(schema, "")).toBe(VALIDATION_MESSAGES.required("Amount"));
  });

  it("refuses more than two decimal places", () => {
    expect(messageOf(schema, "1.234")).toBe(VALIDATION_MESSAGES.amount("Amount"));
  });
});

describe("paiseText", () => {
  const schema = paiseText("Price");

  it("stores what was typed in rupees as whole paise", () => {
    expect(schema.parse("19.99")).toBe(1999);
    expect(schema.parse("500")).toBe(50000);
  });

  it("says a blank field is missing", () => {
    expect(messageOf(schema, "")).toBe(VALIDATION_MESSAGES.required("Price"));
  });

  it("refuses an amount that is not an amount", () => {
    expect(messageOf(schema, "five hundred")).toBe(VALIDATION_MESSAGES.amount("Price"));
    expect(messageOf(schema, "₹")).toBe(VALIDATION_MESSAGES.amount("Price"));
    expect(messageOf(schema, "12.345")).toBe(VALIDATION_MESSAGES.amount("Price"));
  });

  it("accepts money the way people write it (BUG-10)", () => {
    expect(schema.parse("₹1,500")).toBe(150000);
    expect(schema.parse("1,00,000.50")).toBe(10000050);
    expect(schema.parse(" ₹ 250 ")).toBe(25000);
  });

  it("stops at ₹10,00,000, so it fits its column (BUG-12)", () => {
    expect(schema.parse("10,00,000")).toBe(100_000_000);
    expect(messageOf(schema, "10,00,000.01")).toBe(VALIDATION_MESSAGES.tooLarge("Price", "₹10,00,000"));
    expect(messageOf(schema, "99999999999999")).toBe(VALIDATION_MESSAGES.tooLarge("Price", "₹10,00,000"));
  });
});

describe("paiseAmount", () => {
  it("takes whole paise within the field's bounds", () => {
    expect(paiseAmount("Amount").parse(50000)).toBe(50000);
    expect(messageOf(paiseAmount("Amount"), 0)).toBe(VALIDATION_MESSAGES.moreThanZero("Amount"));
    expect(paiseAmount("Price", { allowZero: true }).parse(0)).toBe(0);
    expect(messageOf(paiseAmount("Price", { allowZero: true }), -1)).toBe(VALIDATION_MESSAGES.notNegative("Price"));
    expect(messageOf(paiseAmount("Amount"), 100_000_001)).toBe(VALIDATION_MESSAGES.tooLarge("Amount", "₹10,00,000"));
  });

  it("names the field when it is not a number at all", () => {
    expect(messageOf(paiseAmount("Amount"), "500")).toBe(VALIDATION_MESSAGES.amount("Amount"));
    expect(messageOf(paiseAmount("Amount"), 12.5)).toBe(VALIDATION_MESSAGES.wholeNumber("Amount"));
  });
});

describe("quantity", () => {
  it("is a whole number from 1 to 9,999", () => {
    expect(quantity().parse(3)).toBe(3);
    expect(messageOf(quantity(), 0)).toBe(VALIDATION_MESSAGES.moreThanZero("Quantity"));
    expect(messageOf(quantity(), 1.5)).toBe(VALIDATION_MESSAGES.wholeNumber("Quantity"));
    expect(messageOf(quantity(), 10_000)).toBe(VALIDATION_MESSAGES.tooLarge("Quantity", "9,999"));
  });

  it("says an emptied field is missing, instead of Zod's NaN message (BUG-11)", () => {
    expect(messageOf(quantity(), Number.NaN)).toBe(VALIDATION_MESSAGES.required("Quantity"));
    expect(messageOf(quantity(), undefined)).toBe(VALIDATION_MESSAGES.required("Quantity"));
  });
});

describe("requiredText", () => {
  const schema = requiredText("Name", 5);

  it("trims what it keeps and names the field in each refusal", () => {
    expect(schema.parse("  Anu ")).toBe("Anu");
    expect(messageOf(schema, "   ")).toBe(VALIDATION_MESSAGES.required("Name"));
    expect(messageOf(schema, "Priyanka")).toBe(VALIDATION_MESSAGES.tooLong("Name", 5));
    expect(messageOf(schema, undefined)).toBe(VALIDATION_MESSAGES.required("Name"));
  });
});

describe("wholeNumberText and positiveWholeText", () => {
  it("reads a count, and lets it be negative where that is meaningful", () => {
    expect(wholeNumberText("Quantity").parse("12")).toBe(12);
    expect(wholeNumberText("Quantity").parse("-3")).toBe(-3);
  });

  it("reads a count written with a comma", () => {
    expect(wholeNumberText("Quantity").parse("1,500")).toBe(1500);
  });

  it("stops at its bound either way, so it fits its column (BUG-12)", () => {
    expect(messageOf(wholeNumberText("Quantity"), "10000")).toBe(VALIDATION_MESSAGES.tooLarge("Quantity", "9,999"));
    expect(messageOf(wholeNumberText("Quantity"), "-10000")).toBe(VALIDATION_MESSAGES.tooLarge("Quantity", "9,999"));
    expect(wholeNumberText("Quantity", 1_000_000).parse("25,000")).toBe(25000);
  });

  it("refuses a fraction of a count", () => {
    expect(messageOf(wholeNumberText("Quantity"), "1.5")).toBe(
      VALIDATION_MESSAGES.wholeNumber("Quantity"),
    );
  });

  it("insists a positive count is above zero", () => {
    expect(positiveWholeText("Quantity").parse("3")).toBe(3);
    expect(messageOf(positiveWholeText("Quantity"), "0")).toBe(
      VALIDATION_MESSAGES.moreThanZero("Quantity"),
    );
  });
});

describe("optionalNumberText", () => {
  it("leaves a blank measurement null", () => {
    expect(optionalNumberText("Weight").parse("")).toBeNull();
    expect(optionalNumberText("Weight").parse("2.5")).toBe(2.5);
  });

  it("names the field when it is not a number", () => {
    expect(messageOf(optionalNumberText("Weight"), "heavy")).toBe(VALIDATION_MESSAGES.number("Weight"));
  });
});

describe("firstIssue", () => {
  it("is what a single field shows", () => {
    const result = z.object({ name: z.string().min(1, "Name needs a value.") }).safeParse({ name: "" });
    expect(result.success ? "" : firstIssue(result.error)).toBe("Name needs a value.");
  });
});

describe("requiredEmail", () => {
  const email = requiredEmail("Email address");

  it("lower-cases what was typed, so it matches the column it is stored in", () => {
    expect(email.parse("  ASHA@Example.COM ")).toBe("asha@example.com");
  });

  it("insists on one", () => {
    expect(email.safeParse("").success).toBe(false);
  });

  it("refuses something that is not an address", () => {
    const result = email.safeParse("asha@example");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(firstIssue(result.error)).toBe(VALIDATION_MESSAGES.email("Email address"));
    }
  });

  it("refuses one longer than the column can hold", () => {
    expect(email.safeParse(`${"a".repeat(250)}@example.com`).success).toBe(false);
  });
});
