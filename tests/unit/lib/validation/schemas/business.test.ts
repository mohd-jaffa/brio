import { describe, expect, it } from "vitest";

import { businessProfileSchema } from "@/lib/validation/schemas/business";

const valid = {
  name: "  Sweet   Delights ",
  tagline: "",
  city: "Pune",
  address: "12 MG Road\n\nCamp",
  phone: "98765 43210",
};

const messages = (input: unknown) => {
  const result = businessProfileSchema.safeParse(input);
  return result.success
    ? {}
    : Object.fromEntries(result.error.issues.map((issue) => [issue.path.join("."), issue.message]));
};

describe("businessProfileSchema", () => {
  it("stores the profile the way it is shown: tidied, a blank catch phrase as none, the number with +91", () => {
    expect(businessProfileSchema.parse(valid)).toEqual({
      name: "Sweet Delights",
      tagline: null,
      city: "Pune",
      address: "12 MG Road\n\nCamp",
      phone: "+919876543210",
    });
  });

  it("asks for the name, city, address and phone, each in its own words", () => {
    expect(messages({ name: "", tagline: "", city: "", address: "", phone: "" })).toEqual({
      name: "Business name needs a value.",
      city: "City needs a value.",
      address: "Address needs a value.",
      phone: "Business phone needs a value.",
    });
  });

  it("holds each field to the database's limits", () => {
    expect(
      messages({ ...valid, name: "S", tagline: "x".repeat(81), city: "x".repeat(81), address: "x".repeat(301) }),
    ).toEqual({
      name: "Business name must be at least 2 characters.",
      tagline: "Catch phrase can be at most 80 characters.",
      city: "City can be at most 80 characters.",
      address: "Address can be at most 300 characters.",
    });
  });

  it("refuses a number that is not a mobile number", () => {
    expect(messages({ ...valid, phone: "12345" })).toEqual({ phone: "Enter a valid mobile number." });
  });
});
