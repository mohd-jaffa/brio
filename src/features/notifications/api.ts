import type { SupabaseClient } from "@supabase/supabase-js";

import { DUE_NOTICE_FROM_HOUR } from "@/constants/limits";
import { NOTIFICATION_TAB_KINDS, type NotificationKind } from "@/constants/statuses";
import { pageWindow, toPage, type Page } from "@/lib/api/pagination";
import { fromPostgrestError } from "@/lib/errors/fromSupabaseError";
import type { Tenant } from "@/lib/supabase/tenant";
import { requireRow } from "@/lib/supabase/writes";
import type { NotificationListQuery } from "@/lib/validation";

import type { AppNotification, NotificationPayload } from "./types";

interface NotificationRow {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
}

const COLUMNS = "id, kind, title, body, action_url, is_read, created_at";

function toNotification(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    actionUrl: row.action_url,
    read: row.is_read,
    createdAt: row.created_at,
  };
}

/**
 * `GET /api/notifications` (plan §139.10): the business's notifications,
 * newest first and a page at a time, narrowed to one tab's kinds.
 */
export async function listNotifications(tenant: Tenant, query: NotificationListQuery): Promise<Page<AppNotification>> {
  const window = pageWindow(query.cursor);
  let request = tenant.supabase.from("notifications").select(COLUMNS).eq("bakery_id", tenant.bakeryId);
  if (query.tab !== "ALL") request = request.in("kind", [...NOTIFICATION_TAB_KINDS[query.tab]]);

  const { data, error } = await request
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .range(window.from, window.to);
  if (error) throw fromPostgrestError(error);
  const page = toPage((data ?? []) as NotificationRow[], query.cursor);
  return { ...page, items: page.items.map(toNotification) };
}

/** `GET /api/notifications/unread`: how many wait, for the bell's dot. */
export async function countUnread(tenant: Tenant): Promise<{ unread: number }> {
  const { count, error } = await tenant.supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("bakery_id", tenant.bakeryId)
    .eq("is_read", false);
  if (error) throw fromPostgrestError(error);
  return { unread: count ?? 0 };
}

/**
 * `POST /api/notifications/{id}/read`: one marked read, as it is opened. Read
 * already is no failure; one that is not the business's is not found.
 */
export async function markNotificationRead(tenant: Tenant, id: string): Promise<{ read: true }> {
  await requireRow(
    tenant.supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("bakery_id", tenant.bakeryId)
      .eq("id", id)
      .select("id")
      .maybeSingle(),
    "RECORD_NOT_FOUND",
  );
  return { read: true };
}

/** `POST /api/notifications/read-all`: every unread one marked read; how many were. */
export async function markAllNotificationsRead(tenant: Tenant): Promise<{ read: number }> {
  const { data, error } = await tenant.supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("bakery_id", tenant.bakeryId)
    .eq("is_read", false)
    .select("id");
  if (error) throw fromPostgrestError(error);
  return { read: data?.length ?? 0 };
}

/**
 * The worker's write, through the service role (0022): one notification per
 * job, which takes the job's id — so a job tried again after its notification
 * was written does not write a second.
 */
export async function recordNotification(
  client: SupabaseClient,
  entry: { id: string; bakeryId: string; kind: NotificationKind; text: NotificationPayload; actionUrl: string | null },
): Promise<void> {
  const { error } = await client.from("notifications").upsert(
    {
      id: entry.id,
      bakery_id: entry.bakeryId,
      kind: entry.kind,
      title: entry.text.title,
      body: entry.text.body,
      action_url: entry.actionUrl,
    },
    { onConflict: "id", ignoreDuplicates: true },
  );
  if (error) throw fromPostgrestError(error);
}

/**
 * The worker's sweep (0023): queues a notification for each open order due
 * today or tomorrow, and each one overdue, that has not been told yet — from
 * the business's morning. Returns how many it queued.
 */
export async function queueDueOrderNotifications(client: SupabaseClient): Promise<number> {
  const { data, error } = await client.rpc("queue_due_order_notifications", { p_from_hour: DUE_NOTICE_FROM_HOUR });
  if (error) throw fromPostgrestError(error);
  return Number(data ?? 0);
}
