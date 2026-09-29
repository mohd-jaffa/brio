import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { getProductsByIds } from "@/features/products/api";
import { tenantOf } from "@tests/support/tenant";

const row = (id: string) => ({
  id,
  bakery_id: "b-1",
  name: "Cake",
  description: null,
  default_price: 125_000,
  unit: "piece",
  icon_key: null,
  is_active: true,
  created_at: "2026-09-25T00:00:00Z",
  updated_at: "2026-09-25T00:00:00Z",
});

function recordingClient(answer: { data: unknown; error: unknown }) {
  const filters: unknown[][] = [];
  const builder = {
    select: () => builder,
    eq: (...args: unknown[]) => (filters.push(["eq", ...args]), builder),
    in: (...args: unknown[]) => (filters.push(["in", ...args]), Promise.resolve(answer)),
  };
  return { client: { from: () => builder } as unknown as SupabaseClient, filters };
}

describe("getProductsByIds", () => {
  it("reads this business's products in one query, each id once", async () => {
    const { client, filters } = recordingClient({ data: [row("p-1"), row("p-2")], error: null });
    const products = await getProductsByIds(tenantOf(client), ["p-1", "p-2", "p-1"]);
    expect(products.map((product) => product.id)).toEqual(["p-1", "p-2"]);
    expect(filters).toEqual([
      ["eq", "bakery_id", "b-1"],
      ["in", "id", ["p-1", "p-2"]],
    ]);
  });

  it("asks nothing for no ids", async () => {
    const client = {
      from: () => {
        throw new Error("should not query");
      },
    } as unknown as SupabaseClient;
    await expect(getProductsByIds(tenantOf(client), [])).resolves.toEqual([]);
  });

  it("passes a failed read on in the app's words", async () => {
    const { client } = recordingClient({
      data: null,
      error: { code: "42501", message: "permission denied for table products" },
    });
    await expect(getProductsByIds(tenantOf(client), ["p-1"])).rejects.toMatchObject({ code: "AUTH_ROLE_FORBIDDEN" });
  });
});
