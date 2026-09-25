import { beforeEach, describe, expect, it, vi } from "vitest";

import type { OrderRow } from "@/features/orders/types";

const { findOrderById, getOrderById, logActionSafe } = vi.hoisted(() => ({
  findOrderById: vi.fn(),
  getOrderById: vi.fn(),
  logActionSafe: vi.fn(),
}));
vi.mock("@/features/orders/api", () => ({ findOrderById }));
vi.mock("@/features/orders/queries", () => ({ getOrderById }));
vi.mock("@/lib/audit/auditLog", () => ({ logActionSafe }));

import { updateOrderStatus } from "@/features/orders/status";
import { tenantOf } from "@tests/support/tenant";

const before = { id: "o-1", order_number: "ORD-1001", status: "PENDING" } as OrderRow;
const after = { ...before, status: "IN_PROGRESS" } as OrderRow;

function rpcClient(answer: { data: unknown; error: unknown }) {
  const calls: unknown[][] = [];
  const client = {
    rpc: (...args: unknown[]) => {
      calls.push(args);
      return { single: () => Promise.resolve(answer) };
    },
  };
  return { client, calls };
}

beforeEach(() => {
  vi.clearAllMocks();
  findOrderById.mockResolvedValue({ order: before, items: [], adjustments: [] });
  getOrderById.mockResolvedValue({ id: "o-1", status: "IN_PROGRESS" });
});

describe("updateOrderStatus", () => {
  it("moves the order in one call, from where it was read (§133.3 C6)", async () => {
    const { client, calls } = rpcClient({ data: after, error: null });
    await expect(updateOrderStatus(tenantOf(client), "o-1", { status: "IN_PROGRESS" })).resolves.toEqual({
      id: "o-1",
      status: "IN_PROGRESS",
    });
    expect(calls).toEqual([["change_order_status", { p_order_id: "o-1", p_from: "PENDING", p_to: "IN_PROGRESS" }]]);
  });

  it("audits the move, before and after, as the user who made it", async () => {
    const { client } = rpcClient({ data: after, error: null });
    const tenant = tenantOf(client, { actorId: "u-7" });
    await updateOrderStatus(tenant, "o-1", { status: "IN_PROGRESS" });
    expect(logActionSafe).toHaveBeenCalledWith(tenant, {
      action: "STATUS_CHANGE",
      entity_type: "orders",
      entity_id: "o-1",
      previous_data: before,
      new_data: after,
    });
  });

  it("changes nothing when the order is already there", async () => {
    const { client, calls } = rpcClient({ data: null, error: null });
    await updateOrderStatus(tenantOf(client), "o-1", { status: "PENDING" });
    expect(calls).toEqual([]);
    expect(logActionSafe).not.toHaveBeenCalled();
  });

  it("passes on a move the table refuses, in the app's words, and audits nothing (BUG-05)", async () => {
    const { client } = rpcClient({
      data: null,
      error: { code: "P0001", hint: "ORDER_STATUS_TRANSITION_INVALID", message: "transition not allowed" },
    });
    await expect(updateOrderStatus(tenantOf(client), "o-1", { status: "DELIVERED" })).rejects.toMatchObject({
      code: "ORDER_STATUS_TRANSITION_INVALID",
      httpStatus: 422,
    });
    expect(logActionSafe).not.toHaveBeenCalled();
  });

  it("says so when another tap or device moved the order first", async () => {
    const { client } = rpcClient({ data: null, error: { code: "P0001", hint: "ORDER_STATUS_CHANGED", message: "moved" } });
    await expect(updateOrderStatus(tenantOf(client), "o-1", { status: "IN_PROGRESS" })).rejects.toMatchObject({
      code: "ORDER_STATUS_CHANGED",
      httpStatus: 409,
    });
  });

  it("refuses an order this business does not have", async () => {
    findOrderById.mockRejectedValue(Object.assign(new Error("x"), { code: "RECORD_NOT_FOUND" }));
    const { client, calls } = rpcClient({ data: null, error: null });
    await expect(updateOrderStatus(tenantOf(client), "o-1", { status: "IN_PROGRESS" })).rejects.toMatchObject({
      code: "RECORD_NOT_FOUND",
    });
    expect(calls).toEqual([]);
  });
});
