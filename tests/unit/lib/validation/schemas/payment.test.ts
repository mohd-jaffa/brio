import { describe, expect, it } from "vitest";

import { createPaymentSchema, paymentFormSchema } from "@/lib/validation/index";

const UUID = "3f2504e0-4f89-11d3-9a0c-0305e82c3301";

describe("payment", () => {
  it("crosses the wire as whole paise", () => {
    const parsed = createPaymentSchema.parse({
      order_id: UUID,
      amount: 50000,
      payment_method: "UPI",
    });
    expect(parsed.amount).toBe(50000);
  });

  it("refuses a payment of nothing", () => {
    expect(createPaymentSchema.safeParse({ order_id: UUID, amount: 0, payment_method: "UPI" }).success).toBe(false);
  });

  it("the form takes rupees and hands over paise", () => {
    expect(paymentFormSchema.parse({ amount: "499.50", payment_method: "CASH", reference: "" })).toEqual({
      amount: 49950,
      payment_method: "CASH",
      reference: null,
    });
  });
});
