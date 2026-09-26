import { beforeEach, describe, expect, it, vi } from "vitest";

const getOrderById = vi.hoisted(() => vi.fn());
const findPaymentsByOrderId = vi.hoisted(() => vi.fn());
const getCustomerById = vi.hoisted(() => vi.fn());
const getBusiness = vi.hoisted(() => vi.fn());
vi.mock("@/features/orders/queries", () => ({ getOrderById }));
vi.mock("@/features/payments/api", () => ({ findPaymentsByOrderId }));
vi.mock("@/features/customers/api", () => ({ getCustomerById }));
vi.mock("@/features/business/api", () => ({ getBusiness }));
vi.mock("@/lib/env/server", () => ({ getServerEnv: () => ({ NEXT_PUBLIC_APP_URL: "https://ovenly.app" }) }));

import { getBill } from "@/features/receipts/api";

import { aBusiness } from "@tests/support/bills";
import { anOrder, aPayment } from "@tests/support/orders";
import { tenantOf } from "@tests/support/tenant";

const tenant = tenantOf({});

beforeEach(() => {
  vi.clearAllMocks();
  findPaymentsByOrderId.mockResolvedValue([aPayment()]);
  getCustomerById.mockResolvedValue({ id: "c-1", name: "Meena Gupta", phone: "+919834567890" });
  getBusiness.mockResolvedValue(aBusiness());
});

describe("getBill", () => {
  it("reads the order, its payments, its customer and the business, through the caller's own client", async () => {
    getOrderById.mockResolvedValue(anOrder());
    const bill = await getBill(tenant, "o-1");

    expect(getOrderById).toHaveBeenCalledWith(tenant, "o-1");
    expect(findPaymentsByOrderId).toHaveBeenCalledWith(tenant, "o-1");
    expect(getCustomerById).toHaveBeenCalledWith(tenant, "c-1");
    expect(getBusiness).toHaveBeenCalledWith(tenant);
    expect(bill).toMatchObject({
      kind: "CONFIRMED",
      orderNumber: "ORD-1006",
      billedTo: { kind: "CUSTOMER", name: "Meena Gupta" },
      business: { name: "Sweet Delights Home Bakery" },
      payments: [{ method: "CASH", amount: 50000 }],
      appUrl: "https://ovenly.app",
    });
  });

  it("reads no customer for a Guest order", async () => {
    getOrderById.mockResolvedValue(anOrder({ customerId: null }));
    expect((await getBill(tenant, "o-1")).billedTo).toEqual({ kind: "GUEST" });
    expect(getCustomerById).not.toHaveBeenCalled();
  });

  it("passes on an order that is not this business's", async () => {
    getOrderById.mockRejectedValue(new Error("not found"));
    await expect(getBill(tenant, "o-9")).rejects.toThrow("not found");
    expect(getBusiness).not.toHaveBeenCalled();
  });
});
