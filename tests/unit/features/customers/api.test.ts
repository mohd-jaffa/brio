import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppError } from "@/lib/errors";

const { insert, update, find } = vi.hoisted(() => ({ insert: vi.fn(), update: vi.fn(), find: vi.fn() }));
vi.mock("@/lib/supabase/records", () => ({
  tenantRecords: () => ({ insert, update, list: vi.fn(), find, remove: vi.fn() }),
}));

import { createCustomer, getCustomerSummary, updateCustomer } from "@/features/customers/api";
import { fakeSupabase } from "@tests/support/supabase";
import { tenantOf } from "@tests/support/tenant";

const row = (id: string, name: string) => ({
  id,
  bakery_id: "b-1",
  name,
  phone: "+919876543210",
  email: null,
  address: null,
  google_maps_link: null,
  notes: null,
  created_at: "2026-09-25T00:00:00Z",
  updated_at: "2026-09-25T00:00:00Z",
});

const duplicate = () => new AppError({ kind: "CONFLICT", code: "CONFLICT" });

/** A client that answers the phone lookup with `holder`, recording its filters. */
function lookupClient(holder: { id: string; name: string } | null) {
  const filters: unknown[][] = [];
  const chain = {
    select: () => chain,
    eq: (...args: unknown[]) => (filters.push(args), chain),
    maybeSingle: () => Promise.resolve({ data: holder, error: null }),
  };
  return { client: { from: () => chain } as unknown as SupabaseClient, filters };
}

const input = { name: "Priya Menon", phone: "+919876543210", email: null, address: null, googleMapsLink: null, notes: null };

beforeEach(() => vi.clearAllMocks());

describe("a customer's phone number, already taken (§139.6, §139.11.4)", () => {
  it("names the customer who has it, so the order screen can offer Use that customer", async () => {
    insert.mockRejectedValue(duplicate());
    const { client, filters } = lookupClient({ id: "c-9", name: "Priya M." });

    await expect(createCustomer(tenantOf(client), input)).rejects.toMatchObject({
      code: "CUSTOMER_PHONE_ALREADY_EXISTS",
      kind: "CONFLICT",
      details: { customerId: "c-9", name: "Priya M." },
    });
    expect(filters).toEqual([["bakery_id", "b-1"], ["phone", "+919876543210"]]);
  });

  it("says the same when an edit takes another customer's number", async () => {
    update.mockRejectedValue(duplicate());
    const { client } = lookupClient({ id: "c-9", name: "Priya M." });
    await expect(updateCustomer(tenantOf(client), "c-1", { phone: "+919876543210" })).rejects.toMatchObject({
      code: "CUSTOMER_PHONE_ALREADY_EXISTS",
    });
  });

  it("passes on any other refusal as it was", async () => {
    const other = duplicate();
    insert.mockRejectedValue(other);
    const { client } = lookupClient(null);
    await expect(createCustomer(tenantOf(client), input)).rejects.toBe(other);

    const edit = duplicate();
    update.mockRejectedValue(edit);
    const self = lookupClient({ id: "c-1", name: "Priya Menon" });
    await expect(updateCustomer(tenantOf(self.client), "c-1", { phone: "+919876543210" })).rejects.toBe(edit);
  });

  it("looks nothing up when the write worked", async () => {
    insert.mockResolvedValue(row("c-1", "Priya Menon"));
    const client = { from: () => { throw new Error("no lookup"); } } as unknown as SupabaseClient;
    await expect(createCustomer(tenantOf(client), input)).resolves.toMatchObject({ id: "c-1", name: "Priya Menon" });
  });
});

describe("getCustomerSummary", () => {
  const now = new Date("2026-09-26T06:00:00Z");

  it("reads the customer, then their orders once with only what the sums need", async () => {
    find.mockResolvedValue(row("c-1", "Anu Sharma"));
    const fake = fakeSupabase(() => ({
      data: [
        {
          total: 100000,
          status: "DELIVERED",
          created_at: "2026-09-20T05:00:00Z",
          delivery_type: "PICKUP",
          delivery_address: null,
          delivery_google_maps_link: null,
          payments: [{ amount: 40000 }],
        },
      ],
    }));
    const summary = await getCustomerSummary(tenantOf(fake.client), "c-1", now);

    expect(find).toHaveBeenCalledWith("c-1");
    const [orders] = fake.queries;
    expect(orders.table).toBe("orders");
    expect(fake.argsOf(orders, "select")[0][0]).toContain("payments(amount)");
    expect(fake.argsOf(orders, "eq")).toEqual([
      ["bakery_id", "b-1"],
      ["customer_id", "c-1"],
    ]);
    expect(summary).toMatchObject({ orders: 1, spent: 100000, balanceDue: 60000, segment: "NEW", addresses: [] });
  });

  it("reads a customer with no orders, and passes on a refusal", async () => {
    find.mockResolvedValue(row("c-1", "Anu Sharma"));
    expect((await getCustomerSummary(tenantOf(fakeSupabase(() => ({ data: null })).client), "c-1", now)).orders).toBe(0);
    const refused = fakeSupabase(() => ({ error: { code: "PGRST000", message: "down" } }));
    await expect(getCustomerSummary(tenantOf(refused.client), "c-1", now)).rejects.toBeInstanceOf(AppError);
  });
});
