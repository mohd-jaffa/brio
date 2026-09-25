import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { OrderRow } from "@/features/orders/types";

const findOrderById = vi.fn();
const updateOrder = vi.fn();
vi.mock("@/features/orders/api", () => ({
  findOrderById: (...args: unknown[]) => findOrderById(...args),
  updateOrder: (...args: unknown[]) => updateOrder(...args),
}));
vi.mock("@/lib/audit/auditLog", () => ({ logActionSafe: vi.fn() }));
vi.mock("@/lib/jobs/queue", () => ({ createJob: vi.fn() }));

import { processPayment } from "@/features/payments/api";
import { tenantOf } from "@tests/support/tenant";

const ORDER_ID = "7c1f3a52-9d7e-4b1a-8a51-0f1d2c3b4a5e";

function orderRow(total: number, payment_status: OrderRow["payment_status"] = "UNPAID"): OrderRow {
  return {
    id: ORDER_ID,
    bakery_id: "b-1",
    customer_id: "c-1",
    order_number: "#1-001",
    status: "PENDING",
    payment_status,
    payment_method: null,
    payment_reference: null,
    subtotal: total,
    discount: 0,
    delivery_charge: 0,
    tax: 0,
    total,
    delivery_type: "PICKUP",
    delivery_date: "2026-09-25T10:00:00Z",
    delivery_address: null,
    delivery_google_maps_link: null,
    notes: null,
    created_at: "2026-09-24T10:00:00Z",
    updated_at: "2026-09-24T10:00:00Z",
  };
}

/**
 * Just enough of supabase-js for the payments table: reading what was already
 * paid on an order, and inserting the new payment. Every insert is recorded so
 * a test can see exactly what reached the database.
 */
function fakeClient(alreadyPaid: number[]) {
  const inserted: Record<string, unknown>[] = [];
  const client = {
    from(table: string) {
      if (table !== "payments") throw new Error(`unexpected table ${table}`);
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              order: () =>
                Promise.resolve({ data: alreadyPaid.map((amount) => ({ amount })), error: null }),
            }),
          }),
        }),
        insert: (row: Record<string, unknown>) => {
          inserted.push(row);
          return {
            select: () => ({
              single: () => Promise.resolve({ data: { id: "p-1", ...row }, error: null }),
            }),
          };
        },
      };
    },
  };
  return { client: client as unknown as SupabaseClient, inserted };
}

describe("processPayment", () => {
  beforeEach(() => {
    findOrderById.mockReset();
    updateOrder.mockReset();
  });

  it("stores the amount it was given — already paise — without converting it again", async () => {
    findOrderById.mockResolvedValue({ order: orderRow(150000), items: [], adjustments: [] });
    const { client, inserted } = fakeClient([]);

    await processPayment(tenantOf(client), {
      order_id: ORDER_ID,
      amount: 50000, // ₹500
      payment_method: "UPI",
      reference: null,
    });

    expect(inserted).toHaveLength(1);
    expect(inserted[0].amount).toBe(50000);
  });

  it("accepts a part payment well above 1% of the order", async () => {
    findOrderById.mockResolvedValue({ order: orderRow(150000), items: [], adjustments: [] });
    const { client } = fakeClient([]);

    await expect(
      processPayment(tenantOf(client), {
        order_id: ORDER_ID,
        amount: 100000,
        payment_method: "CASH",
        reference: null,
      }),
    ).resolves.toMatchObject({ amount: 100000 });
    expect(updateOrder).toHaveBeenCalledWith(tenantOf(client), ORDER_ID, {
      payment_status: "PARTIALLY_PAID",
    });
  });

  it("marks the order paid when the payments reach its total", async () => {
    findOrderById.mockResolvedValue({
      order: orderRow(150000, "PARTIALLY_PAID"),
      items: [],
      adjustments: [],
    });
    const { client } = fakeClient([100000]);

    await processPayment(tenantOf(client), {
      order_id: ORDER_ID,
      amount: 50000,
      payment_method: "UPI",
      reference: "UPI-1",
    });

    expect(updateOrder).toHaveBeenCalledWith(tenantOf(client), ORDER_ID, { payment_status: "PAID" });
  });

  it("refuses a payment that would take the order past its total, and records nothing", async () => {
    findOrderById.mockResolvedValue({ order: orderRow(150000), items: [], adjustments: [] });
    const { client, inserted } = fakeClient([100000]);

    await expect(
      processPayment(tenantOf(client), {
        order_id: ORDER_ID,
        amount: 50001,
        payment_method: "CASH",
        reference: null,
      }),
    ).rejects.toMatchObject({ kind: "CONFLICT" });
    expect(inserted).toHaveLength(0);
    expect(updateOrder).not.toHaveBeenCalled();
  });

  it("leaves the payment status alone when it has not changed", async () => {
    findOrderById.mockResolvedValue({
      order: orderRow(150000, "PARTIALLY_PAID"),
      items: [],
      adjustments: [],
    });
    const { client } = fakeClient([10000]);

    await processPayment(tenantOf(client), {
      order_id: ORDER_ID,
      amount: 10000,
      payment_method: "CASH",
      reference: null,
    });

    expect(updateOrder).not.toHaveBeenCalled();
  });
});
