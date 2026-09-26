import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppError } from "@/lib/errors";

const { insert, update, find } = vi.hoisted(() => ({ insert: vi.fn(), update: vi.fn(), find: vi.fn() }));
vi.mock("@/lib/supabase/records", () => ({
  tenantRecords: () => ({ insert, update, list: vi.fn(), find, remove: vi.fn() }),
}));

import { PAGE_SIZE } from "@/constants/limits";
import { createCustomer, getCustomerSummary, listCustomers, updateCustomer } from "@/features/customers/api";
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

describe("listCustomers", () => {
  const now = new Date("2026-09-26T06:00:00Z");
  const stats = (id: string, name: string, orders: number, created = "2026-01-01T00:00:00Z") => ({
    ...row(id, name),
    created_at: created,
    order_count: orders,
    last_order_at: orders ? "2026-09-24T05:00:00Z" : null,
  });

  it("reads a page of the business's customers by name, each with their orders and segment", async () => {
    const fake = fakeSupabase(() => ({ data: [stats("c-1", "Anu", 4), stats("c-2", "Bina", 0, "2026-09-20T00:00:00Z"), stats("c-3", "Chitra", 1)] }));
    const page = await listCustomers(tenantOf(fake.client), { search: null }, now);

    const [query] = fake.queries;
    expect(query.table).toBe("customer_stats");
    expect(fake.argsOf(query, "eq")).toEqual([["bakery_id", "b-1"]]);
    expect(fake.argsOf(query, "order")).toEqual([
      ["name", { ascending: true }],
      ["id", { ascending: true }],
    ]);
    expect(fake.argsOf(query, "range")).toEqual([[0, PAGE_SIZE]]);
    expect(page.nextCursor).toBeNull();
    expect(page.items.map(({ name, orders, lastOrderAt, segment }) => ({ name, orders, lastOrderAt, segment }))).toEqual([
      { name: "Anu", orders: 4, lastOrderAt: "2026-09-24T05:00:00Z", segment: "REGULAR" },
      { name: "Bina", orders: 0, lastOrderAt: null, segment: "NEW" },
      { name: "Chitra", orders: 1, lastOrderAt: "2026-09-24T05:00:00Z", segment: null },
    ]);
    expect(page.items[0]).toMatchObject({ id: "c-1", phone: "+919876543210" });
  });

  it("keeps to the Regulars, or the New who are not yet Regular, in the database", async () => {
    const regular = fakeSupabase(() => ({ data: [] }));
    await listCustomers(tenantOf(regular.client), { search: null, segment: "REGULAR" }, now);
    expect(regular.argsOf(regular.queries[0], "gte")).toEqual([["order_count", 3]]);

    const fresh = fakeSupabase(() => ({ data: [] }));
    await listCustomers(tenantOf(fresh.client), { search: null, segment: "NEW" }, now);
    expect(fresh.argsOf(fresh.queries[0], "lt")).toEqual([["order_count", 3]]);
    expect(fresh.argsOf(fresh.queries[0], "gte")).toEqual([["created_at", "2026-08-27T18:30:00.000Z"]]);
  });

  it("searches the name, and the phone on its digits however typed (BUG-23), and pages on", async () => {
    const rows = Array.from({ length: PAGE_SIZE + 1 }, (_, index) => stats(`c-${index}`, `Name ${index}`, 0));
    const fake = fakeSupabase(() => ({ data: rows }));
    const page = await listCustomers(tenantOf(fake.client), { search: "98765 43210", cursor: 20 }, now);
    expect(fake.argsOf(fake.queries[0], "or")).toEqual([['name.ilike."%98765 43210%",phone.like."%9876543210%"']]);
    expect(fake.argsOf(fake.queries[0], "range")).toEqual([[20, 20 + PAGE_SIZE]]);
    expect(page.items).toHaveLength(PAGE_SIZE);
    expect(page.nextCursor).toBe(String(20 + PAGE_SIZE));

    const byName = fakeSupabase(() => ({ data: null }));
    expect((await listCustomers(tenantOf(byName.client), { search: "Anu" }, now)).items).toEqual([]);
    expect(byName.argsOf(byName.queries[0], "or")).toEqual([['name.ilike."%Anu%"']]);

    const nothing = fakeSupabase(() => ({ data: [] }));
    await listCustomers(tenantOf(nothing.client), { search: "%" }, now);
    expect(nothing.argsOf(nothing.queries[0], "or")).toEqual([]);
  });

  it("passes on a refusal in the app's own words", async () => {
    const fake = fakeSupabase(() => ({ error: { code: "PGRST000", message: "down" } }));
    await expect(listCustomers(tenantOf(fake.client), { search: null }, now)).rejects.toBeInstanceOf(AppError);
  });
});
