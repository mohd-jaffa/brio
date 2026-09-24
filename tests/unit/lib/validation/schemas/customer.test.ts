import { describe, expect, it } from "vitest";

import { createCustomerSchema } from "@/lib/validation/index";


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
