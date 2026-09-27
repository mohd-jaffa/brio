import { randomUUID } from "node:crypto";

import { SWEEP_INTERVAL_MS, WORKER_ENABLED } from "@/constants/jobs";
import { DUE_NOTICE_FROM_HOUR } from "@/constants/limits";
import { fromPostgrestError } from "@/lib/errors/fromSupabaseError";
import { logger } from "@/lib/logger";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import type { Tenant } from "@/lib/supabase/tenant";
import type { NotificationListQuery } from "@/lib/validation";

import { countUnread, listNotifications, recordNotification } from "./api";
import { notificationKind, notificationLink, notificationText, readNotificationMessage } from "./text";

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
 * (BUG-26). A look that fails is logged, and the bell still answers.
 */
export function checkDueOrders(tenant: Tenant): Promise<void> {
  if (WORKER_ENABLED) return Promise.resolve();
  const last = looks.get(tenant.bakeryId);
  if (last && Date.now() - last.at < SWEEP_INTERVAL_MS) return last.run;

  const run = tellDueOrders(tenant.bakeryId).catch((error: unknown) => {
    logger.error("Could not look for orders due", {
      bakeryId: tenant.bakeryId,
      reason: error instanceof Error ? error.message : String(error),
    });
  });
  looks.set(tenant.bakeryId, { at: Date.now(), run });
  return run;
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
  }
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
