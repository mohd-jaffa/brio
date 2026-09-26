import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { findPaidByOrder } from "@/features/orders/api";
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
