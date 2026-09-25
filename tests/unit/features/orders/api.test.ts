import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { findAllOrders, findPaidByOrder, moveOrderStatus } from "@/features/orders/api";
import { tenantOf } from "@tests/support/tenant";

/**
 * A query builder that records every filter it is given and answers with
 * whatever the test says the database returned.
 */
function recordingClient(answer: { data: unknown; error: unknown }) {
  const filters: [string, unknown][] = [];
  const builder: Record<string, unknown> = {};
  for (const method of ["update", "select"]) builder[method] = () => builder;
  builder.is = (column: string, value: unknown) => {
    filters.push([`${column} is`, value]);
    return builder;
  };
  builder.order = () => Promise.resolve(answer);
  builder.eq = (column: string, value: unknown) => {
    filters.push([column, value]);
    return builder;
  };
  builder.in = (column: string, value: unknown) => {
    filters.push([column, value]);
    return Promise.resolve(answer);
  };
  builder.maybeSingle = () => Promise.resolve(answer);
  const client = { from: () => builder } as unknown as SupabaseClient;
  return { client, filters };
}

describe("findAllOrders", () => {
  it("reads every order of the business when nothing narrows it", async () => {
    const { client, filters } = recordingClient({ data: [], error: null });
    await findAllOrders(tenantOf(client));
    expect(filters).toEqual([["bakery_id", "b-1"]]);
  });

  it("reads only the Guest orders for customer=guest (§139.11.3)", async () => {
    const { client, filters } = recordingClient({ data: [], error: null });
    await findAllOrders(tenantOf(client), { customer: "guest" });
    expect(filters).toEqual([["bakery_id", "b-1"], ["customer_id is", null]]);
  });

  it("reads one customer's orders for their id", async () => {
    const { client, filters } = recordingClient({ data: [], error: null });
    await findAllOrders(tenantOf(client), { customer: "c-1" });
    expect(filters).toEqual([["bakery_id", "b-1"], ["customer_id", "c-1"]]);
  });
});

describe("moveOrderStatus", () => {
  it("changes the order only if it is still in the status it was read in", async () => {
    const { client, filters } = recordingClient({ data: { id: "o-1", status: "DELIVERED" }, error: null });
    await expect(moveOrderStatus(tenantOf(client), "o-1", "IN_TRANSIT", "DELIVERED")).resolves.toMatchObject({
      status: "DELIVERED",
    });
    expect(filters).toContainEqual(["status", "IN_TRANSIT"]);
    expect(filters).toContainEqual(["bakery_id", "b-1"]);
  });

  it("reports a conflict when the order had already moved", async () => {
    const { client } = recordingClient({ data: null, error: null });
    await expect(moveOrderStatus(tenantOf(client), "o-1", "IN_TRANSIT", "DELIVERED")).rejects.toMatchObject({
      code: "ORDER_STATUS_CHANGED",
      kind: "CONFLICT",
    });
  });
});

describe("findPaidByOrder", () => {
  it("adds up each order's payments", async () => {
    const { client } = recordingClient({
      data: [
        { order_id: "a", amount: 50000 },
        { order_id: "a", amount: 25000 },
        { order_id: "b", amount: 10000 },
      ],
      error: null,
    });
    const paid = await findPaidByOrder(tenantOf(client), ["a", "b", "c"]);
    expect(paid.get("a")).toBe(75000);
    expect(paid.get("b")).toBe(10000);
    expect(paid.has("c")).toBe(false);
  });

  it("asks nothing for an empty list", async () => {
    const client = { from: () => { throw new Error("should not query"); } } as unknown as SupabaseClient;
    await expect(findPaidByOrder(tenantOf(client), [])).resolves.toEqual(new Map());
  });
});
