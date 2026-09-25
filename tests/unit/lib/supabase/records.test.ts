import { beforeEach, describe, expect, it, vi } from "vitest";

const logActionSafe = vi.fn();
vi.mock("@/lib/audit/auditLog", () => ({ logActionSafe: (...args: unknown[]) => logActionSafe(...args) }));

import { tenantRecords } from "@/lib/supabase/records";
import { tenantOf } from "@tests/support/tenant";

type Row = { id: string; name: string };

/**
 * A query builder that records every filter and write, and answers each
 * awaited query with the next result given.
 */
function fakeClient(results: Array<{ data: unknown; error: unknown }>) {
  const log: unknown[][] = [];
  const next = () => Promise.resolve(results.shift() ?? { data: null, error: null });
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "eq", "order", "insert", "update", "delete"]) {
    builder[method] = (...args: unknown[]) => {
      log.push([method, ...args]);
      return builder;
    };
  }
  builder.maybeSingle = () => next();
  builder.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => next().then(resolve, reject);
  const client = { from: (table: string) => (log.push(["from", table]), builder) };
  return { client, log };
}

beforeEach(() => logActionSafe.mockReset());

describe("tenantRecords", () => {
  it("scopes every read to the tenant's business", async () => {
    const { client, log } = fakeClient([{ data: [{ id: "c-1", name: "A" }], error: null }]);
    await expect(tenantRecords<Row>(tenantOf(client, { bakeryId: "b-9" }), "customers").list([{ column: "name" }])).resolves.toEqual([
      { id: "c-1", name: "A" },
    ]);
    expect(log).toContainEqual(["eq", "bakery_id", "b-9"]);
    expect(log).toContainEqual(["order", "name", { ascending: true }]);
  });

  it("stamps an insert with the tenant's business, and audits it as the acting user's", async () => {
    const created = { id: "c-2", name: "B" };
    const { client, log } = fakeClient([{ data: created, error: null }]);
    const tenant = tenantOf(client, { bakeryId: "b-9", actorId: "u-7" });

    await tenantRecords<Row>(tenant, "customers").insert({ name: "B" });

    expect(log).toContainEqual(["insert", { name: "B", bakery_id: "b-9" }]);
    expect(logActionSafe).toHaveBeenCalledWith(tenant, {
      action: "CREATE",
      entity_type: "customers",
      entity_id: "c-2",
      previous_data: null,
      new_data: created,
    });
  });

  it("audits an update with the row before and after", async () => {
    const before = { id: "c-1", name: "A" };
    const after = { id: "c-1", name: "B" };
    const { client } = fakeClient([{ data: before, error: null }, { data: after, error: null }]);
    const tenant = tenantOf(client);

    await tenantRecords<Row>(tenant, "customers").update("c-1", { name: "B", bakery_id: "x" }, ["name"]);

    expect(logActionSafe).toHaveBeenCalledWith(tenant, expect.objectContaining({ action: "UPDATE", previous_data: before, new_data: after }));
  });

  it("audits a removal with the row that was removed", async () => {
    const gone = { id: "c-1", name: "A" };
    const { client } = fakeClient([{ data: gone, error: null }]);
    const tenant = tenantOf(client);

    await tenantRecords<Row>(tenant, "expenses").remove("c-1");

    expect(logActionSafe).toHaveBeenCalledWith(tenant, expect.objectContaining({ action: "DELETE", entity_type: "expenses", previous_data: gone, new_data: null }));
  });

  it("audits nothing when a write is refused", async () => {
    const { client } = fakeClient([{ data: null, error: null }]);
    await expect(tenantRecords<Row>(tenantOf(client), "customers").remove("c-1")).rejects.toMatchObject({ code: "RECORD_NOT_FOUND" });
    expect(logActionSafe).not.toHaveBeenCalled();
  });
});
