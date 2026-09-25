import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppError } from "@/lib/errors";

const { insert, update } = vi.hoisted(() => ({ insert: vi.fn(), update: vi.fn() }));
vi.mock("@/lib/supabase/records", () => ({
  tenantRecords: () => ({ insert, update, list: vi.fn(), find: vi.fn(), remove: vi.fn() }),
}));

import { createCustomer, updateCustomer } from "@/features/customers/api";
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
