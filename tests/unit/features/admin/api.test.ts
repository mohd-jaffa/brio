import { describe, expect, it } from "vitest";

import { listAccounts, listAuditLog, listErrorLog, readOverview } from "@/features/admin/api";
import { AppError } from "@/lib/errors/AppError";
import { fakeSupabase, type RecordedQuery } from "@tests/support/supabase";

const calls = (query: RecordedQuery, method: string) =>
  query.calls.filter(([name]) => name === method).map(([, ...args]) => args);

describe("readOverview", () => {
  it("counts the accounts, businesses, audit lines and errors, without reading a row of them", async () => {
    const counts: Record<string, number> = {
      "profiles:": 5,
      "profiles:USER": 4,
      "profiles:DEV": 1,
      "bakeries:": 4,
      "audit_logs:": 120,
      "audit_logs:day": 9,
      "error_logs:": 3,
      "error_logs:day": 1,
    };
    const fake = fakeSupabase((query) => {
      const eq = calls(query, "eq")[0];
      const since = calls(query, "gte")[0];
      return { count: counts[`${query.table}:${eq ? eq[1] : since ? "day" : ""}`] };
    });
    const now = new Date("2026-09-27T12:00:00Z");

    await expect(readOverview(fake.client, now)).resolves.toEqual({
      users: { total: 5, owners: 4, developers: 1 },
      businesses: 4,
      audit: { total: 120, lastDay: 9 },
      errors: { total: 3, lastDay: 1 },
    });
    for (const query of fake.queries) expect(calls(query, "select")[0]).toEqual(["id", { count: "exact", head: true }]);
    expect(fake.find("audit_logs", "gte", "created_at", "2026-09-26T12:00:00.000Z")).toBeDefined();
    expect(fake.find("error_logs", "gte", "created_at", "2026-09-26T12:00:00.000Z")).toBeDefined();
  });

  it("counts nothing as none, and says a refusal in the app's words", async () => {
    const empty = fakeSupabase(() => ({ count: null }));
    expect((await readOverview(empty.client)).users.total).toBe(0);
    const broken = fakeSupabase(() => ({ error: { code: "08006", message: "connection lost" } }));
    await expect(readOverview(broken.client)).rejects.toBeInstanceOf(AppError);
  });
});

describe("listAccounts", () => {
  const owner = {
    id: "u-1",
    name: "Priya Baker",
    phone: "+919876543210",
    email: "baker@example.com",
    role: "USER",
    avatar: "beagle",
    is_active: true,
    must_change_password: false,
    email_confirmed_at: "2026-06-26T10:00:00Z",
    created_at: "2026-06-26T10:00:00Z",
    business: { business_name: "Sweet Delights", city: "Bengaluru" },
  };

  it("reads every account newest first, a page at a time, with the business an owner runs", async () => {
    const fake = fakeSupabase(() => ({ data: [owner, { ...owner, id: "u-2", role: "DEV", business: null }] }));
    const page = await listAccounts(fake.client, { cursor: 20 });

    expect(page.items).toEqual([
      {
        id: "u-1",
        name: "Priya Baker",
        phone: "+919876543210",
        email: "baker@example.com",
        role: "USER",
        avatar: "beagle",
        active: true,
        mustChangePassword: false,
        emailConfirmedAt: "2026-06-26T10:00:00Z",
        createdAt: "2026-06-26T10:00:00Z",
        business: { name: "Sweet Delights", city: "Bengaluru" },
      },
      expect.objectContaining({ id: "u-2", role: "DEV", business: null }),
    ]);
    const [query] = fake.queries;
    expect(query.table).toBe("profiles");
    expect(String(calls(query, "select")[0][0])).toContain("business:bakeries(business_name, city)");
    expect(calls(query, "order")[0]).toEqual(["created_at", { ascending: false }]);
    expect(calls(query, "range")[0]).toEqual([20, 40]);
  });

  it("answers an empty page when there are none, and a refusal in the app's words", async () => {
    await expect(listAccounts(fakeSupabase(() => ({ data: null })).client, {})).resolves.toEqual({
      items: [],
      nextCursor: null,
    });
    await expect(listAccounts(fakeSupabase(() => ({ error: { message: "down" } })).client, {})).rejects.toBeInstanceOf(
      AppError,
    );
  });
});

describe("listAuditLog", () => {
  const line = {
    id: "a-1",
    action: "UPDATE",
    entity_type: "orders",
    entity_id: "o-1",
    previous_data: { status: "PENDING" },
    new_data: { status: "READY" },
    created_at: "2026-09-27T10:00:00Z",
    actor: { name: "Priya Baker" },
    business: { business_name: "Sweet Delights" },
  };

  it("reads every business's trail newest first, with who did it and for which business", async () => {
    const fake = fakeSupabase(() => ({ data: [line, { ...line, id: "a-2", actor: null, business: null }] }));
    const page = await listAuditLog(fake.client, {});
    expect(page.items).toEqual([
      {
        id: "a-1",
        action: "UPDATE",
        entityType: "orders",
        entityId: "o-1",
        actor: "Priya Baker",
        business: "Sweet Delights",
        before: { status: "PENDING" },
        after: { status: "READY" },
        createdAt: "2026-09-27T10:00:00Z",
      },
      expect.objectContaining({ id: "a-2", actor: null, business: null }),
    ]);
    expect(fake.queries[0].table).toBe("audit_logs");
    expect(calls(fake.queries[0], "range")[0]).toEqual([0, 20]);
  });

  it("answers an empty page when there are none, and a refusal in the app's words", async () => {
    await expect(listAuditLog(fakeSupabase(() => ({ data: null })).client, {})).resolves.toEqual({
      items: [],
      nextCursor: null,
    });
    await expect(listAuditLog(fakeSupabase(() => ({ error: { message: "down" } })).client, {})).rejects.toBeInstanceOf(
      AppError,
    );
  });
});

describe("listErrorLog", () => {
  const failure = {
    id: "e-1",
    source: "API",
    message: "API request failed",
    reference: "req_1",
    code: "INTERNAL_ERROR",
    kind: "INTERNAL",
    http_status: 500,
    method: "POST",
    path: "/api/orders",
    detail: "connection lost",
    stack: "Error: connection lost",
    context: { traceId: "t-1" },
    created_at: "2026-09-27T10:00:00Z",
    user: { name: "Priya Baker" },
    business: { business_name: "Sweet Delights" },
  };

  it("reads what failed newest first, with who was asking and for which business", async () => {
    const fake = fakeSupabase(() => ({ data: [failure, { ...failure, id: "e-2", user: null, business: null }] }));
    const page = await listErrorLog(fake.client, { search: null });
    expect(page.items).toEqual([
      {
        id: "e-1",
        source: "API",
        message: "API request failed",
        reference: "req_1",
        code: "INTERNAL_ERROR",
        kind: "INTERNAL",
        httpStatus: 500,
        method: "POST",
        path: "/api/orders",
        user: "Priya Baker",
        business: "Sweet Delights",
        detail: "connection lost",
        stack: "Error: connection lost",
        context: { traceId: "t-1" },
        createdAt: "2026-09-27T10:00:00Z",
      },
      expect.objectContaining({ id: "e-2", user: null, business: null }),
    ]);
    const [query] = fake.queries;
    expect(query.table).toBe("error_logs");
    expect(String(calls(query, "select")[0][0])).toContain("user:profiles(name), business:bakeries(business_name)");
    expect(calls(query, "order")[0]).toEqual(["created_at", { ascending: false }]);
    expect(calls(query, "or")).toEqual([]);
  });

  it("finds a quoted reference, underscore and all, or words of the message", async () => {
    const fake = fakeSupabase(() => ({ data: [] }));
    await listErrorLog(fake.client, { search: "req_5e1d" });
    expect(calls(fake.queries[0], "or")[0]).toEqual(['reference.ilike."%req_5e1d%",message.ilike."%req_5e1d%"']);

    const blank = fakeSupabase(() => ({ data: [] }));
    await listErrorLog(blank.client, { search: "%*" });
    expect(calls(blank.queries[0], "or")).toEqual([]);
  });

  it("answers an empty page when there are none, and a refusal in the app's words", async () => {
    await expect(listErrorLog(fakeSupabase(() => ({ data: null })).client, { search: null })).resolves.toEqual({
      items: [],
      nextCursor: null,
    });
    await expect(
      listErrorLog(fakeSupabase(() => ({ error: { message: "down" } })).client, { search: null }),
    ).rejects.toBeInstanceOf(AppError);
  });
});
