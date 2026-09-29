import { DUE_NOTICE_FROM_HOUR, REMINDER_ORDERS_MAX } from "@/constants/limits";
import { OPEN_STATUSES } from "@/constants/statuses";
import { addDaysKey, dayHour, dayKey, dayStart, todayKey } from "@/lib/dates/calendar";
import { fromPostgrestError } from "@/lib/errors/fromSupabaseError";
import type { Reminder } from "@/lib/native";
import type { Tenant } from "@/lib/supabase/tenant";

import { notificationLink, notificationText, type NotificationMessage } from "./text";

/** An open order as a reminder needs it: when it is due, whom for, and what the inbox has told. */
export interface ReminderOrderRow {
  id: string;
  order_number: string;
  delivery_date: string;
  due_notified_at: string | null;
  overdue_notified_at: string | null;
  customers: { name: string } | null;
}

const COLUMNS = "id, order_number, delivery_date, due_notified_at, overdue_notified_at, customers(name)";

function reminder(message: Extract<NotificationMessage, { orderId: string }>, at: string): Reminder {
  const { title, body } = notificationText(message);
  return { key: `${message.kind}:${message.orderId}`, at, title, body, url: notificationLink(message) };
}

/**
 * The reminders one open order is owed, by the inbox's rule (0023; plan
 * §139.11.15): due soon once — in the business's morning the day before it is
 * due, or else of the day itself — and overdue once, the morning after. Only
 * what is still ahead: what is already due has been told by the inbox the
 * moment the app was open, and one the inbox has told is not told again.
 */
export function remindersFor(row: ReminderOrderRow, now: Date = new Date()): Reminder[] {
  const due = dayKey(row.delivery_date);
  if (!due) return [];
  const order = { orderId: row.id, orderNumber: row.order_number, customerName: row.customers?.name ?? null };
  const morning = (day: string) => dayHour(day, DUE_NOTICE_FROM_HOUR);
  const ahead = (instant: string) => new Date(instant).getTime() > now.getTime();
  const reminders: Reminder[] = [];

  if (!row.due_notified_at) {
    const soon = (
      [
        ["TOMORROW", addDaysKey(due, -1)],
        ["TODAY", due],
      ] as const
    ).find(([, day]) => ahead(morning(day)));
    if (soon) reminders.push(reminder({ kind: "ORDER_DUE", ...order, day: soon[0] }, morning(soon[1])));
  }

  const late = morning(addDaysKey(due, 1));
  if (!row.overdue_notified_at && ahead(late)) {
    reminders.push(reminder({ kind: "ORDER_OVERDUE", ...order, dueDate: due }, late));
  }
  return reminders;
}

/**
 * `GET /api/notifications/reminders` (R8.6): what the Android app should have
 * set, for the business's open orders due from yesterday on — an order due
 * yesterday is still owed its overdue reminder this morning — soonest first,
 * `REMINDER_ORDERS_MAX` of them at most. Worded here, from messages.ts, as
 * the inbox is; the phone only sets them.
 */
export async function listReminders(tenant: Tenant, now: Date = new Date()): Promise<Reminder[]> {
  const { data, error } = await tenant.supabase
    .from("orders")
    .select(COLUMNS)
    .eq("bakery_id", tenant.bakeryId)
    .in("status", [...OPEN_STATUSES])
    .gte("delivery_date", dayStart(addDaysKey(todayKey(now), -1)))
    .order("delivery_date", { ascending: true })
    .order("id", { ascending: true })
    .limit(REMINDER_ORDERS_MAX);
  if (error) throw fromPostgrestError(error);
  return ((data ?? []) as unknown as ReminderOrderRow[]).flatMap((row) => remindersFor(row, now));
}
