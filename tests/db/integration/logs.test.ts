import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { listErrorLog } from "@/features/admin/api";
import { captureError } from "@/lib/audit/errorLog";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { registerBusiness, removeBusinesses, type TestBusiness } from "@tests/support/integration";

/**
 * The error log and seven days for every log (0036; the user, 2026-09-30):
 * the server writes a failure with who was asking, the console finds it by
 * its reference, the hourly sweep drops audit and error rows past seven
 * days, and a deleted account takes its business's rows with it.
 */
const admin = createSupabaseServiceRoleClient();
const DAY_MS = 86_400_000;
let owner: TestBusiness;

beforeAll(async () => {
  owner = await registerBusiness("Log Bakes");
});

afterAll(removeBusinesses);

const errorRows = async (reference: string) =>
  (await admin.from("error_logs").select("id, created_at").eq("reference", reference)).data ?? [];

describe("the error log", () => {
  it("keeps a failure with who was asking, and the console finds it by its reference", async () => {
    const reference = `req_${randomUUID()}`;
    await captureError({
      source: "API",
      message: "API request failed",
      error: new Error("connection terminated"),
      reference,
      code: "INTERNAL_ERROR",
      kind: "INTERNAL",
      httpStatus: 500,
      method: "POST",
      path: "/api/orders",
      userId: owner.userId,
      bakeryId: owner.bakeryId,
      context: { password: "never kept" },
    });

    const page = await listErrorLog(admin, { search: reference });
    expect(page.items).toHaveLength(1);
    expect(page.items[0]).toMatchObject({
      source: "API",
      reference,
      httpStatus: 500,
      user: "Test Owner",
      business: "Log Bakes",
      detail: "connection terminated",
      context: { password: "[Redacted]" },
    });
    expect(page.items[0].stack).toContain("connection terminated");
  });
});

describe("seven days for every log", () => {
  it("drops audit and error rows past their seventh day, and keeps the rest", async () => {
    const at = (days: number) => new Date(Date.now() - days * DAY_MS).toISOString();
    const old = `req_${randomUUID()}`;
    const recent = `req_${randomUUID()}`;
    await admin.from("error_logs").insert([
      { source: "SERVER", message: "old", reference: old, bakery_id: owner.bakeryId, created_at: at(8) },
      { source: "SERVER", message: "recent", reference: recent, bakery_id: owner.bakeryId, created_at: at(6) },
    ]);
    const entity = randomUUID();
    const audit = (days: number) => ({
      bakery_id: owner.bakeryId,
      user_id: owner.userId,
      action: "UPDATE",
      entity_type: "customers",
      entity_id: entity,
      created_at: at(days),
    });
    await admin.from("audit_logs").insert([audit(8), audit(6)]);

    const { data: removed, error } = await admin.rpc("clean_up_logs");
    expect(error).toBeNull();
    expect(removed).toBeGreaterThanOrEqual(2);

    expect(await errorRows(old)).toEqual([]);
    expect(await errorRows(recent)).toHaveLength(1);
    const { data: kept } = await admin.from("audit_logs").select("created_at").eq("entity_id", entity);
    expect(kept).toHaveLength(1);
  });

  it("is the server's alone: an owner cannot run the sweep", async () => {
    const { error } = await owner.tenant.supabase.rpc("clean_up_logs");
    expect(error?.code).toBe("42501");
  });
});

describe("deleting an account", () => {
  it("takes its business's error rows with it", async () => {
    const reference = `req_${randomUUID()}`;
    await captureError({ message: "Before the account went", reference, bakeryId: owner.bakeryId });
    expect(await errorRows(reference)).toHaveLength(1);
    await removeBusinesses();
    expect(await errorRows(reference)).toEqual([]);
  });
});
