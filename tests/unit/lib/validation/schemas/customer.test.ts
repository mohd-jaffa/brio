import { describe, expect, it } from "vitest";

import { VALIDATION_MESSAGES } from "@/constants/messages";
import { createCustomerSchema, customerListQuerySchema } from "@/lib/validation/index";


describe("customer", () => {
  it("normalises the phone number so one customer is one row", () => {
    const parsed = createCustomerSchema.parse({ name: "Meena", phone: "+91 98765-43210" });
    expect(parsed.phone).toBe("+919876543210");
  });

  it("stores the fields left blank as nothing", () => {
    const parsed = createCustomerSchema.parse({ name: "Meena", phone: "9876543210", email: "" });
    expect(parsed.email).toBeNull();
  });

  it("insists on a name", () => {
    expect(createCustomerSchema.safeParse({ name: "", phone: "9876543210" }).success).toBe(false);
  });
});

describe("customer list query", () => {
  it("takes a segment's tab, a search and where the page starts (§139.10)", () => {
    expect(customerListQuerySchema.parse({ segment: "REGULAR", search: " Anu ", cursor: "20" })).toEqual({
      segment: "REGULAR",
      search: "Anu",
      cursor: 20,
    });
    expect(customerListQuerySchema.parse({})).toEqual({ search: null });
  });

  it("refuses a segment it does not know, in its own words", () => {
    expect(customerListQuerySchema.safeParse({ segment: "WHOLESALE" }).error?.issues[0].message).toBe(VALIDATION_MESSAGES.invalid);
  });
});
