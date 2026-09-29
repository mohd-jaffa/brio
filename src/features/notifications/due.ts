import { randomUUID } from "node:crypto";

import { SWEEP_INTERVAL_MS, WORKER_ENABLED } from "@/constants/jobs";
import { DUE_NOTICE_FROM_HOUR } from "@/constants/limits";
import { fromPostgrestError } from "@/lib/errors/fromSupabaseError";
import { logger } from "@/lib/logger";
import { readAll } from "@/lib/supabase/readAll";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import type { Tenant } from "@/lib/supabase/tenant";
import type { NotificationListQuery } from "@/lib/validation";

import { countUnread, listNotifications, recordNotification } from "./api";
import { pushToBusiness } from "./push";
import {
  notificationKind,
  notificationLink,
  notificationText,
  readNotificationMessage,
  type NotificationMessage,
} from "./text";

interface DueNoticeRow {
  kind: string;
  order_id: string;
  order_number: string;
  customer_name: string | null;
  due_day: string | null;
  due_date: string | null;
}

/** When each business was last looked at by this server, and that look, for whoever asks meanwhile. */
const looks = new Map<string, { at: number; run: Promise<void> }>();

/**
 * Orders due today or tomorrow, and overdue, told once each (0023's rule),
 * while no worker runs to sweep for them (WORKER_ENABLED; the user,
 * 2026-09-27). The app looks as the owner reads the bell or the inbox — every
 * signed-in screen reads the bell, and the bell asks again every minute — so
 * a notice arrives within a minute of the app being open, and none while
 * nobody looks. A business is looked at once a minute at most by one server;
 * a read in that minute waits for the look in hand, so the inbox never draws
 * before what it found is written.
 *
 * `take_due_order_notices` (0027) marks what is due and hands back the facts;
 * the words are written here, from messages.ts, as the worker writes them
 * (BUG-26). Each is then pushed to the business's browsers that want them
 * (R8.6). A look that fails is logged, and the bell still answers.
 */
export function checkDueOrders(tenant: Tenant): Promise<void> {
  return lookForDueOrders(tenant.bakeryId);
}

function lookForDueOrders(bakeryId: string): Promise<void> {
  if (WORKER_ENABLED) return Promise.resolve();
  const last = looks.get(bakeryId);
  if (last && Date.now() - last.at < SWEEP_INTERVAL_MS) return last.run;

  const run = tellDueOrders(bakeryId).catch((error: unknown) => {
    logger.error("Could not look for orders due", {
      bakeryId,
      reason: error instanceof Error ? error.message : String(error),
    });
  });
  looks.set(bakeryId, { at: Date.now(), run });
  return run;
}

/**
 * `POST /api/cron/due-orders` (R8.6): the database's scheduler asks every
 * five minutes (0031), so a business whose browsers want pushes is looked at
 * with nobody in the app — at 8 AM, not when the owner next opens it. Each
 * such business is looked at as the bell would look. Businesses with none are
 * left to their bell.
 */
export async function sweepDueOrders(): Promise<{ businesses: number }> {
  if (WORKER_ENABLED) return { businesses: 0 };
  const client = createSupabaseServiceRoleClient();
  const rows = await readAll<{ id: string; bakery_id: string }>((from, to) =>
    client.from("device_tokens").select("id, bakery_id").order("id", { ascending: true }).range(from, to),
  );
  const businesses = [...new Set(rows.map((row) => row.bakery_id))];
  for (const bakeryId of businesses) await lookForDueOrders(bakeryId);
  return { businesses: businesses.length };
}

async function tellDueOrders(bakeryId: string): Promise<void> {
  // The service role: notifications are written by the server only (0022),
  // and the function is the server's. The business is the signed-in owner's.
  const client = createSupabaseServiceRoleClient();
  const { data, error } = await client.rpc("take_due_order_notices", {
    p_bakery_id: bakeryId,
    p_from_hour: DUE_NOTICE_FROM_HOUR,
  });
  if (error) throw fromPostgrestError(error);

  const told: NotificationMessage[] = [];
  for (const row of (data ?? []) as DueNoticeRow[]) {
    const message = readNotificationMessage({
      kind: row.kind,
      orderId: row.order_id,
      orderNumber: row.order_number,
      customerName: row.customer_name,
      day: row.due_day,
      dueDate: row.due_date,
    });
    if (!message) continue;
    await recordNotification(client, {
      id: randomUUID(),
      bakeryId,
      kind: notificationKind(message),
      text: notificationText(message),
      actionUrl: notificationLink(message),
    });
    told.push(message);
  }
  await pushToBusiness(client, bakeryId, told);
}

/** The bell's count (`GET /api/notifications/unread`), once the orders due have been looked at. */
export async function countUnreadAfterDue(tenant: Tenant): Promise<{ unread: number }> {
  await checkDueOrders(tenant);
  return countUnread(tenant);
}

/** The inbox (`GET /api/notifications`), once the orders due have been looked at. */
export async function listNotificationsAfterDue(tenant: Tenant, query: NotificationListQuery) {
  await checkDueOrders(tenant);
  return listNotifications(tenant, query);
}
