import { describe, expect, it } from "vitest";

import { PAGE_SIZE } from "@/constants/limits";
import { getInventoryBalances, listStockMovements } from "@/features/inventory/api";
import { AppError } from "@/lib/errors";

import { fakeSupabase } from "@tests/support/supabase";
import { tenantOf } from "@tests/support/tenant";

const PRODUCT = "3f2504e0-4f89-11d3-9a0c-0305e82c3301";

const movement = (id: string, quantity: number) => ({
  id,
  bakery_id: "b-1",
  product_id: PRODUCT,
  type: "STOCK_IN",
  quantity,
  reference_type: null,
  reference_id: null,
  created_at: "2026-09-26T05:00:00Z",
});

describe("getInventoryBalances", () => {
  it("reads each product's balance as the database adds it up, never the ledger's lines (0019)", async () => {
    const fake = fakeSupabase(() => ({
      data: [{ product_id: PRODUCT, balance: 14, stocked: true, last_moved_at: "2026-09-26T05:00:00Z" }],
    }));
    expect(await getInventoryBalances(tenantOf(fake.client))).toEqual([
      { productId: PRODUCT, balance: 14, stocked: true, lastMovedAt: "2026-09-26T05:00:00Z" },
    ]);
    const [query] = fake.queries;
    expect(query.table).toBe("stock_levels");
    expect(fake.argsOf(query, "eq")).toEqual([["bakery_id", "b-1"]]);
    expect(fake.argsOf(query, "in")).toEqual([]);
  });

  it("keeps to the products named, reads none as none, and passes on a refusal", async () => {
    const fake = fakeSupabase(() => ({ data: null }));
    expect(await getInventoryBalances(tenantOf(fake.client), [PRODUCT])).toEqual([]);
    expect(fake.argsOf(fake.queries[0], "in")).toEqual([["product_id", [PRODUCT]]]);

    const refused = fakeSupabase(() => ({ error: { code: "PGRST000", message: "down" } }));
    await expect(getInventoryBalances(tenantOf(refused.client))).rejects.toBeInstanceOf(AppError);
  });
});

describe("listStockMovements", () => {
  it("reads one product's ledger newest first, a page at a time", async () => {
    const rows = Array.from({ length: PAGE_SIZE + 1 }, (_, index) => movement(`t-${index}`, index + 1));
    const fake = fakeSupabase(() => ({ data: rows }));
    const page = await listStockMovements(tenantOf(fake.client), { product: PRODUCT, cursor: 20 });

    const [query] = fake.queries;
    expect(query.table).toBe("inventory_transactions");
    expect(fake.argsOf(query, "eq")).toEqual([
      ["bakery_id", "b-1"],
      ["product_id", PRODUCT],
    ]);
    expect(fake.argsOf(query, "order")).toEqual([
      ["created_at", { ascending: false }],
      ["id", { ascending: true }],
    ]);
    expect(fake.argsOf(query, "range")).toEqual([[20, 20 + PAGE_SIZE]]);
    expect(page.items).toHaveLength(PAGE_SIZE);
    expect(page.items[0]).toEqual({
      id: "t-0",
      productId: PRODUCT,
      type: "STOCK_IN",
      quantity: 1,
      createdAt: "2026-09-26T05:00:00Z",
    });
    expect(page.nextCursor).toBe(String(20 + PAGE_SIZE));
  });

  it("reads a product with no movements, and passes on a refusal", async () => {
    expect(
      (await listStockMovements(tenantOf(fakeSupabase(() => ({ data: null })).client), { product: PRODUCT })).items,
    ).toEqual([]);
    const refused = fakeSupabase(() => ({ error: { code: "PGRST000", message: "down" } }));
    await expect(listStockMovements(tenantOf(refused.client), { product: PRODUCT })).rejects.toBeInstanceOf(AppError);
  });
});
