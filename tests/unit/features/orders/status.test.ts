import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { OrderItemRow, OrderRow } from "@/features/orders/types";

const api = {
  findOrderById: vi.fn(),
  findPaidByOrder: vi.fn(),
  moveOrderStatus: vi.fn(),
  updateOrder: vi.fn(),
};
vi.mock("@/features/orders/api", () => ({
  findOrderById: (...args: unknown[]) => api.findOrderById(...args),
  findPaidByOrder: (...args: unknown[]) => api.findPaidByOrder(...args),
  moveOrderStatus: (...args: unknown[]) => api.moveOrderStatus(...args),
  updateOrder: (...args: unknown[]) => api.updateOrder(...args),
}));
const logInventoryTransaction = vi.fn();
vi.mock("@/features/inventory/api", () => ({
  logInventoryTransaction: (...args: unknown[]) => logInventoryTransaction(...args),
}));
const createJob = vi.fn();
vi.mock("@/lib/jobs/queue", () => ({ createJob: (...args: unknown[]) => createJob(...args) }));
vi.mock("@/lib/audit/auditLog", () => ({ logActionSafe: vi.fn() }));

import { updateOrderStatus } from "@/features/orders/status";
import { tenantOf } from "@tests/support/tenant";

const client = {} as SupabaseClient;

function row(status: OrderRow["status"], delivery_type: OrderRow["delivery_type"] = "DELIVERY"): OrderRow {
  return {
    id: "o-1",
    bakery_id: "b-1",
    customer_id: "c-1",
    order_number: "#1-001",
    status,
    payment_status: "UNPAID",
    payment_method: null,
    payment_reference: null,
    subtotal: 50000,
    discount: 0,
    delivery_charge: 0,
    tax: 0,
    total: 50000,
    delivery_type,
    delivery_date: "2026-09-25T10:00:00Z",
    delivery_address: null,
    delivery_google_maps_link: null,
    notes: null,
    created_at: "2026-09-24T10:00:00Z",
    updated_at: "2026-09-24T10:00:00Z",
  };
}

const items: OrderItemRow[] = [
  {
    id: "i-1",
    order_id: "o-1",
    product_id: "p-cake",
    product_name: "Cake",
    unit_price: 25000,
    quantity: 2,
    subtotal: 50000,
    notes: null,
    created_at: "2026-09-24T10:00:00Z",
  },
];

function orderAt(status: OrderRow["status"], deliveryType?: OrderRow["delivery_type"]) {
  api.findOrderById.mockResolvedValue({ order: row(status, deliveryType), items, adjustments: [] });
}

beforeEach(() => {
  vi.clearAllMocks();
  api.findPaidByOrder.mockResolvedValue(new Map());
  api.moveOrderStatus.mockImplementation((_c, _b, _id, _from, to) => Promise.resolve(row(to)));
});

describe("updateOrderStatus", () => {
  it("refuses a move the table does not allow, and writes nothing", async () => {
    orderAt("DELIVERED");

    await expect(updateOrderStatus(tenantOf(client), "o-1", { status: "PENDING" })).rejects.toMatchObject({
      code: "ORDER_STATUS_TRANSITION_INVALID",
      kind: "BUSINESS_RULE",
    });
    expect(api.moveOrderStatus).not.toHaveBeenCalled();
    expect(logInventoryTransaction).not.toHaveBeenCalled();
    expect(createJob).not.toHaveBeenCalled();
  });

  it("refuses out for delivery on a pickup order", async () => {
    orderAt("IN_PROGRESS", "PICKUP");
    await expect(updateOrderStatus(tenantOf(client), "o-1", { status: "IN_TRANSIT" })).rejects.toMatchObject({
      code: "ORDER_STATUS_TRANSITION_INVALID",
    });
  });

  it("moves the order only from where it was read", async () => {
    orderAt("PENDING");
    await updateOrderStatus(tenantOf(client), "o-1", { status: "IN_PROGRESS" });
    expect(api.moveOrderStatus).toHaveBeenCalledWith(tenantOf(client), "o-1", "PENDING", "IN_PROGRESS");
    expect(logInventoryTransaction).not.toHaveBeenCalled();
    expect(createJob).toHaveBeenCalledOnce();
  });

  it("gives the stock back when an order is cancelled", async () => {
    orderAt("IN_PROGRESS");
    await updateOrderStatus(tenantOf(client), "o-1", { status: "CANCELLED" });

    expect(logInventoryTransaction).toHaveBeenCalledTimes(1);
    expect(logInventoryTransaction).toHaveBeenCalledWith(tenantOf(client), {
      productId: "p-cake",
      type: "ORDER_RESERVATION",
      quantity: 2,
      referenceType: "ORDER",
      referenceId: "o-1",
    });
  });

  it("releases the reservation and posts consumption on delivery, in that order", async () => {
    orderAt("IN_TRANSIT");
    await updateOrderStatus(tenantOf(client), "o-1", { status: "DELIVERED" });

    expect(logInventoryTransaction.mock.calls.map(([, line]) => [line.type, line.quantity])).toEqual([
      ["ORDER_RESERVATION", 2],
      ["ORDER_CONSUMPTION", -2],
    ]);
  });

  it("does not post stock when the order was moved by someone else first", async () => {
    orderAt("IN_TRANSIT");
    api.moveOrderStatus.mockRejectedValue(Object.assign(new Error("moved"), { code: "ORDER_STATUS_CHANGED" }));

    await expect(updateOrderStatus(tenantOf(client), "o-1", { status: "DELIVERED" })).rejects.toMatchObject({
      code: "ORDER_STATUS_CHANGED",
    });
    expect(logInventoryTransaction).not.toHaveBeenCalled();
  });

  it("treats asking for the status it already has as nothing to do", async () => {
    orderAt("PENDING");
    await updateOrderStatus(tenantOf(client), "o-1", { status: "PENDING" });
    expect(api.moveOrderStatus).not.toHaveBeenCalled();
    expect(logInventoryTransaction).not.toHaveBeenCalled();
    expect(createJob).not.toHaveBeenCalled();
  });
});
