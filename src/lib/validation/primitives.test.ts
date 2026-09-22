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
  paiseText,
  positiveWholeText,
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
  });
});

describe("wholeNumberText and positiveWholeText", () => {
  it("reads a count, and lets it be negative where that is meaningful", () => {
    expect(wholeNumberText("Quantity").parse("12")).toBe(12);
    expect(wholeNumberText("Quantity").parse("-3")).toBe(-3);
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
