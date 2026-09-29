import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { countUnread, listNotifications, markNotificationRead, recordNotification } from "@/features/notifications/api";
import { createOrder } from "@/features/orders/checkout";
import type { Order } from "@/features/orders/types";
import { cleanUpQueue } from "@/lib/jobs/cleanup";
import { createJob } from "@/lib/jobs/queue";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { notificationListQuerySchema } from "@/lib/validation";
import { anOrder, registerBusiness, removeBusinesses, type TestBusiness } from "@tests/support/integration";

/**
 * Notifications and the queue against the database (plan §121
 * "Notifications"; §139.11.15, R6.1): orders due are told once, each
 * business's inbox is its own, and the queue takes work only from the server
 * and cleans up after itself.
 */
const admin = createSupabaseServiceRoleClient();
let a: TestBusiness;
let b: TestBusiness;
let dueTomorrow: Order;

beforeAll(async () => {
  [a, b] = await Promise.all([registerBusiness("Notice Bakes"), registerBusiness("Other Bakes")]);
  dueTomorrow = await createOrder(
    a.tenant,
    anOrder({ items: [{ custom: { name: "Birthday cake", unitPrice: 90_000 }, quantity: 1 }] }),
    randomUUID(),
  );
});

afterAll(removeBusinesses);

/** The business's due notices now, from the morning's first hour on (0027). */
async function take(bakeryId: string, fromHour = 0) {
  const { data, error } = await admin.rpc("take_due_order_notices", { p_bakery_id: bakeryId, p_from_hour: fromHour });
  expect(error).toBeNull();
  return data as { kind: string; order_id: string; order_number: string; due_day: string | null }[];
}

describe("orders due", () => {
  it("are told nothing before the business's morning", async () => {
    expect(await take(a.bakeryId, 24)).toEqual([]);
  });

  it("tells of an order due tomorrow once, and only to its own business", async () => {
    expect(await take(b.bakeryId)).toEqual([]);
    expect(await take(a.bakeryId)).toEqual([
      expect.objectContaining({
        kind: "ORDER_DUE",
        order_id: dueTomorrow.id,
        order_number: dueTomorrow.orderNumber,
        due_day: "TOMORROW",
      }),
    ]);
    expect(await take(a.bakeryId)).toEqual([]);
  });

  it("may be asked for only by the server", async () => {
    const { error } = await a.tenant.supabase.rpc("take_due_order_notices", {
      p_bakery_id: a.bakeryId,
      p_from_hour: 0,
    });
    expect(error?.code).toBe("42501");
  });
});

describe("the inbox", () => {
  it("is the business's own: written by the server, read and marked by its owner alone", async () => {
    const id = randomUUID();
    await recordNotification(admin, {
      id,
      bakeryId: a.bakeryId,
      kind: "ORDER",
      text: { title: "Due soon", body: `${dueTomorrow.orderNumber} is due tomorrow.` },
      actionUrl: `/orders/${dueTomorrow.id}`,
    });

    const query = notificationListQuerySchema.parse({});
    expect((await listNotifications(a.tenant, query)).items.map((row) => row.id)).toContain(id);
    expect((await listNotifications(b.tenant, query)).items).toEqual([]);
    expect(await countUnread(a.tenant)).toEqual({ unread: 1 });

    await expect(markNotificationRead(b.tenant, id)).rejects.toMatchObject({ code: "RECORD_NOT_FOUND" });
    expect(await countUnread(a.tenant)).toEqual({ unread: 1 });
    await markNotificationRead(a.tenant, id);
    expect(await countUnread(a.tenant)).toEqual({ unread: 0 });

    const { error } = await a.tenant.supabase
      .from("notifications")
      .insert({ bakery_id: a.bakeryId, kind: "ORDER", title: "Planted", body: "Planted" });
    expect(error?.code).toBe("42501");
  });
});

describe("the queue", () => {
  it("takes work from the server, and cleans away what finished long ago", async () => {
    const marker = randomUUID();
    await createJob({ type: "REFRESH_ANALYTICS", payload: { marker } });

    const long = new Date(Date.now() - 31 * 24 * 60 * 60_000).toISOString();
    const recent = new Date(Date.now() - 29 * 24 * 60 * 60_000).toISOString();
    const { error } = await admin.from("jobs").insert([
      { type: "REFRESH_ANALYTICS", payload: { marker, age: "long" }, status: "completed", completed_at: long },
      { type: "REFRESH_ANALYTICS", payload: { marker, age: "recent" }, status: "completed", completed_at: recent },
    ]);
    expect(error).toBeNull();

    expect(await cleanUpQueue(admin)).toBeGreaterThanOrEqual(1);
    const { data } = await admin.from("jobs").select("status, payload").eq("payload->>marker", marker);
    expect(data?.map((job) => job.payload.age ?? job.status).sort()).toEqual(["pending", "recent"]);
    await admin.from("jobs").delete().eq("payload->>marker", marker);
  });
});
