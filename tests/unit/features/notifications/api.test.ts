import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { DUE_NOTICE_FROM_HOUR, PAGE_SIZE } from "@/constants/limits";
import {
  countUnread,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  queueDueOrderNotifications,
  recordNotification,
} from "@/features/notifications/api";
import { AppError } from "@/lib/errors/AppError";
import { fakeSupabase } from "@tests/support/supabase";
import { tenantOf } from "@tests/support/tenant";

const aRow = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  kind: "ORDER",
  title: "New order",
  body: "ORD-1028 placed for Priya Menon.",
  action_url: "/orders/o-1",
  is_read: false,
  created_at: "2026-09-26T05:00:00Z",
  ...overrides,
});

describe("listNotifications", () => {
  it("reads a page of the business's notifications, newest first, as the inbox shows them", async () => {
    const fake = fakeSupabase(() => ({ data: [aRow("n-1")] }));
    const page = await listNotifications(tenantOf(fake.client), { tab: "ALL" });

    expect(page).toEqual({
      items: [
        {
          id: "n-1",
          kind: "ORDER",
          title: "New order",
          body: "ORD-1028 placed for Priya Menon.",
          actionUrl: "/orders/o-1",
          read: false,
          createdAt: "2026-09-26T05:00:00Z",
        },
      ],
      nextCursor: null,
    });
    const [query] = fake.queries;
    expect(query.table).toBe("notifications");
    expect(fake.argsOf(query, "eq")).toEqual([["bakery_id", "b-1"]]);
    expect(fake.argsOf(query, "in")).toEqual([]);
    expect(fake.argsOf(query, "order")).toEqual([
      ["created_at", { ascending: false }],
      ["id", { ascending: true }],
    ]);
    expect(fake.argsOf(query, "range")).toEqual([[0, PAGE_SIZE]]);
  });

  it("narrows to a tab's kinds, and says where the next page starts", async () => {
    const rows = Array.from({ length: PAGE_SIZE + 1 }, (_, index) => aRow(`n-${index}`, { kind: "PAYMENT" }));
    const fake = fakeSupabase(() => ({ data: rows }));
    const page = await listNotifications(tenantOf(fake.client), { tab: "ORDERS", cursor: 20 });

    expect(page.items).toHaveLength(PAGE_SIZE);
    expect(page.nextCursor).toBe(String(20 + PAGE_SIZE));
    expect(fake.argsOf(fake.queries[0], "in")).toEqual([["kind", ["ORDER", "PAYMENT"]]]);
    expect(fake.argsOf(fake.queries[0], "range")).toEqual([[20, 20 + PAGE_SIZE]]);
  });

  it("answers an empty inbox, and passes a failure on in the app's words", async () => {
    expect(await listNotifications(tenantOf(fakeSupabase(() => ({ data: null })).client), { tab: "SYSTEM" })).toEqual({
      items: [],
      nextCursor: null,
    });
    const failing = fakeSupabase(() => ({ error: { code: "57014", message: "canceling statement" } }));
    await expect(listNotifications(tenantOf(failing.client), { tab: "ALL" })).rejects.toBeInstanceOf(AppError);
  });
});

describe("countUnread", () => {
  it("counts the business's unread without reading them", async () => {
    const fake = fakeSupabase(() => ({ count: 4 }));
    expect(await countUnread(tenantOf(fake.client))).toEqual({ unread: 4 });
    const [query] = fake.queries;
    expect(fake.argsOf(query, "select")).toEqual([["id", { count: "exact", head: true }]]);
    expect(fake.argsOf(query, "eq")).toEqual([
      ["bakery_id", "b-1"],
      ["is_read", false],
    ]);
  });

  it("reads no count as none, and passes a failure on", async () => {
    expect(await countUnread(tenantOf(fakeSupabase(() => ({ count: null })).client))).toEqual({ unread: 0 });
    const failing = fakeSupabase(() => ({ error: { code: "57014", message: "x" } }));
    await expect(countUnread(tenantOf(failing.client))).rejects.toBeInstanceOf(AppError);
  });
});

describe("markNotificationRead", () => {
  it("marks one of the business's read", async () => {
    const fake = fakeSupabase(() => ({ data: { id: "n-1" } }));
    expect(await markNotificationRead(tenantOf(fake.client), "n-1")).toEqual({ read: true });
    const [query] = fake.queries;
    expect(fake.argsOf(query, "update")).toEqual([[{ is_read: true }]]);
    expect(fake.argsOf(query, "eq")).toEqual([
      ["bakery_id", "b-1"],
      ["id", "n-1"],
    ]);
  });

  it("finds none that is not the business's", async () => {
    const fake = fakeSupabase(() => ({ data: null }));
    await expect(markNotificationRead(tenantOf(fake.client), "n-9")).rejects.toMatchObject({ code: "RECORD_NOT_FOUND" });
  });
});

describe("markAllNotificationsRead", () => {
  it("marks every unread one read and says how many", async () => {
    const fake = fakeSupabase(() => ({ data: [{ id: "n-1" }, { id: "n-2" }] }));
    expect(await markAllNotificationsRead(tenantOf(fake.client))).toEqual({ read: 2 });
    expect(fake.argsOf(fake.queries[0], "eq")).toEqual([
      ["bakery_id", "b-1"],
      ["is_read", false],
    ]);
  });

  it("says none when none waited, and passes a failure on", async () => {
    expect(await markAllNotificationsRead(tenantOf(fakeSupabase(() => ({ data: null })).client))).toEqual({ read: 0 });
    const failing = fakeSupabase(() => ({ error: { code: "57014", message: "x" } }));
    await expect(markAllNotificationsRead(tenantOf(failing.client))).rejects.toBeInstanceOf(AppError);
  });
});

describe("recordNotification", () => {
  const entry = {
    id: "j-1",
    bakeryId: "b-1",
    kind: "STOCK" as const,
    text: { title: "Low stock", body: "Brownies is down to 3 pieces." },
    actionUrl: "/inventory",
  };

  it("writes one per job, under the job's id, leaving one already written as it is", async () => {
    const fake = fakeSupabase(() => ({}));
    await recordNotification(fake.client, entry);
    expect(fake.argsOf(fake.queries[0], "upsert")).toEqual([
      [
        {
          id: "j-1",
          bakery_id: "b-1",
          kind: "STOCK",
          title: "Low stock",
          body: "Brownies is down to 3 pieces.",
          action_url: "/inventory",
        },
        { onConflict: "id", ignoreDuplicates: true },
      ],
    ]);
  });

  it("fails the job's attempt when it cannot write", async () => {
    const failing = fakeSupabase(() => ({ error: { code: "57014", message: "x" } }));
    await expect(recordNotification(failing.client, entry)).rejects.toBeInstanceOf(AppError);
  });
});

describe("queueDueOrderNotifications", () => {
  const clientAnswering = (answer: { data: unknown; error: unknown }) => {
    const rpc = vi.fn().mockResolvedValue(answer);
    return { client: { rpc } as unknown as SupabaseClient, rpc };
  };

  it("sweeps from the business's morning and says how many it queued", async () => {
    const { client, rpc } = clientAnswering({ data: 3, error: null });
    expect(await queueDueOrderNotifications(client)).toBe(3);
    expect(rpc).toHaveBeenCalledWith("queue_due_order_notifications", { p_from_hour: DUE_NOTICE_FROM_HOUR });
  });

  it("reads no answer as none, and passes a failure on", async () => {
    expect(await queueDueOrderNotifications(clientAnswering({ data: null, error: null }).client)).toBe(0);
    const failing = clientAnswering({ data: null, error: { code: "42501", message: "permission denied" } });
    await expect(queueDueOrderNotifications(failing.client)).rejects.toBeInstanceOf(AppError);
  });
});
