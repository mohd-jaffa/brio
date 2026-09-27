import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { OrderRow } from "@/features/orders/types";

const { findOrderById, logActionSafe, createJob, mode } = vi.hoisted(() => ({
  findOrderById: vi.fn(),
  logActionSafe: vi.fn(),
  createJob: vi.fn(),
  // Whether a worker runs (WORKER_ENABLED): none for now, and each path is kept.
  mode: { worker: false },
}));
vi.mock("@/constants/jobs", async (original) => ({
  ...(await original<typeof import("@/constants/jobs")>()),
  get WORKER_ENABLED() {
    return mode.worker;
  },
}));
vi.mock("@/features/orders/api", () => ({ findOrderById }));
vi.mock("@/lib/audit/auditLog", () => ({ logActionSafe }));
vi.mock("@/lib/jobs/queue", () => ({ createJob }));
const logger = vi.hoisted(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger }));

import { processPayment } from "@/features/payments/api";
import { tenantOf } from "@tests/support/tenant";

const ORDER_ID = "7c1f3a52-9d7e-4b1a-8a51-0f1d2c3b4a5e";
const KEY = "0d9f4c1e-2b3a-4c5d-8e6f-7a8b9c0d1e2f";

function orderRow(total: number): OrderRow {
  return {
    id: ORDER_ID,
    bakery_id: "b-1",
    customer_id: "c-1",
    order_number: "ORD-1001",
    status: "PENDING",
    payment_status: "UNPAID",
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

type Result = { data: unknown; error: unknown };

/**
 * Just enough of supabase-js for the payments table: looking a payment up by
 * its key, and inserting one. The lookups answer in turn from `byKey`; every
 * insert is recorded, and answers with `insertResult` when one is given.
 */
function fakeClient({ byKey = [] as unknown[], insertResult }: { byKey?: unknown[]; insertResult?: Result } = {}) {
  const inserted: Record<string, unknown>[] = [];
  let lookups = 0;
  const chain = {
    select: () => chain,
    eq: () => chain,
    maybeSingle: () => Promise.resolve({ data: byKey[Math.min(lookups++, byKey.length - 1)] ?? null, error: null }),
  };
  const client = {
    from(table: string) {
      if (table !== "payments") throw new Error(`unexpected table ${table}`);
      return {
        ...chain,
        insert: (row: Record<string, unknown>) => {
          inserted.push(row);
          return {
            select: () => ({
              single: () => Promise.resolve(insertResult ?? { data: { id: "p-1", ...row }, error: null }),
            }),
          };
        },
      };
    },
  };
  return { client: client as unknown as SupabaseClient, inserted };
}

const payment = { order_id: ORDER_ID, amount: 50000, payment_method: "UPI" as const, reference: null };

beforeEach(() => {
  vi.clearAllMocks();
  mode.worker = false;
  findOrderById.mockResolvedValue({ order: orderRow(150000), items: [], adjustments: [] });
});

describe("processPayment", () => {
  it("stores the amount it was given — already paise — with its key", async () => {
    const { client, inserted } = fakeClient();
    await processPayment(tenantOf(client), payment, KEY);

    expect(inserted).toEqual([
      { bakery_id: "b-1", order_id: ORDER_ID, amount: 50000, payment_method: "UPI", reference: null, idempotency_key: KEY },
    ]);
  });

  it("leaves the payment status to the database, which derives it from the payments (BUG-06)", async () => {
    const { client, inserted } = fakeClient();
    await processPayment(tenantOf(client), payment, KEY);
    expect(inserted[0]).not.toHaveProperty("payment_status");
  });

  it("records nothing for a key already used, and answers with what it recorded (§133.3 C2)", async () => {
    const first = { id: "p-1", order_id: ORDER_ID, amount: 50000 };
    const { client, inserted } = fakeClient({ byKey: [first] });

    await expect(processPayment(tenantOf(client), payment, KEY)).resolves.toBe(first);
    expect(inserted).toEqual([]);
    expect(logActionSafe).not.toHaveBeenCalled();
    expect(createJob).not.toHaveBeenCalled();
  });

  it("answers with the other request's payment when both sent the key at once", async () => {
    const first = { id: "p-1", order_id: ORDER_ID, amount: 50000 };
    const { client } = fakeClient({
      byKey: [null, first],
      insertResult: { data: null, error: { code: "23505", message: 'duplicate key value violates unique constraint "payments_bakery_idempotency_key"' } },
    });
    await expect(processPayment(tenantOf(client), payment, KEY)).resolves.toBe(first);
  });

  it("refuses a key reused for another order", async () => {
    const { client } = fakeClient({ byKey: [{ id: "p-1", order_id: "another-order" }] });
    await expect(processPayment(tenantOf(client), payment, KEY)).rejects.toMatchObject({ kind: "CONFLICT" });
  });

  it("passes the database's refusal of too much on, in the app's words", async () => {
    const { client } = fakeClient({
      insertResult: { data: null, error: { code: "P0001", hint: "PAYMENT_EXCEEDS_BALANCE", message: "payment exceeds the balance" } },
    });
    await expect(processPayment(tenantOf(client), payment, KEY)).rejects.toMatchObject({
      code: "PAYMENT_EXCEEDS_BALANCE",
      kind: "BUSINESS_RULE",
      httpStatus: 422,
    });
    expect(logActionSafe).not.toHaveBeenCalled();
  });

  it("refuses an order this business does not have, before anything is written", async () => {
    findOrderById.mockRejectedValue(Object.assign(new Error("x"), { code: "RECORD_NOT_FOUND" }));
    const { client, inserted } = fakeClient();
    await expect(processPayment(tenantOf(client), payment, KEY)).rejects.toMatchObject({ code: "RECORD_NOT_FOUND" });
    expect(inserted).toEqual([]);
  });

  it("audits the payment as the user who recorded it", async () => {
    const { client } = fakeClient();
    const tenant = tenantOf(client, { actorId: "u-7" });
    await processPayment(tenant, payment, KEY);
    expect(logActionSafe).toHaveBeenCalledWith(tenant, expect.objectContaining({ action: "CREATE", entity_type: "payments", entity_id: "p-1" }));
  });

  it("queues no notification while no worker runs: only orders due are told of", async () => {
    const { client } = fakeClient();
    await expect(processPayment(tenantOf(client), payment, KEY)).resolves.toMatchObject({ id: "p-1" });
    expect(createJob).not.toHaveBeenCalled();
  });

  it("queues the notification as facts when a worker runs, so it writes it in rupees (BUG-26)", async () => {
    mode.worker = true;
    const { client } = fakeClient();
    await processPayment(tenantOf(client), payment, KEY);
    expect(createJob).toHaveBeenCalledWith(client, {
      type: "SEND_PUSH_NOTIFICATION",
      payload: { bakeryId: "b-1", message: { kind: "PAYMENT_RECEIVED", orderId: ORDER_ID, orderNumber: "ORD-1001", amount: 50000 } },
    });
  });

  it("keeps the payment when the queue cannot take its notification, and logs it", async () => {
    mode.worker = true;
    createJob.mockRejectedValue(new Error("queue down"));
    const { client } = fakeClient();
    await expect(processPayment(tenantOf(client), payment, KEY)).resolves.toMatchObject({ id: "p-1" });
    expect(logger.error).toHaveBeenCalledWith("Could not queue the payment notification", {
      bakeryId: "b-1",
      orderNumber: "ORD-1001",
      reason: "queue down",
    });
  });
});
