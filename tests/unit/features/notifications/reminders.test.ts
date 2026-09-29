import { describe, expect, it } from "vitest";

import { REMINDER_ORDERS_MAX } from "@/constants/limits";
import { OPEN_STATUSES } from "@/constants/statuses";
import { listReminders, remindersFor, type ReminderOrderRow } from "@/features/notifications/reminders";
import { AppError } from "@/lib/errors/AppError";
import { formatDayMonth } from "@/lib/format/date";
import { fakeSupabase } from "@tests/support/supabase";
import { tenantOf } from "@tests/support/tenant";

/** An instant in India, where the business's day is counted. */
const ist = (local: string) => new Date(`${local}+05:30`);
const at = (local: string) => ist(local).toISOString();

// Due at noon on 1 October.
const order = (overrides: Partial<ReminderOrderRow> = {}): ReminderOrderRow => ({
  id: "o-1",
  order_number: "ORD-1028",
  delivery_date: at("2026-10-01T12:00:00"),
  due_notified_at: null,
  overdue_notified_at: null,
  customers: { name: "Priya Menon" },
  ...overrides,
});

const dueSoon = (when: string, day: "today" | "tomorrow") => ({
  key: "ORDER_DUE:o-1",
  at: at(when),
  title: "Due soon",
  body: `ORD-1028 for Priya Menon is due ${day}.`,
  url: "/orders/o-1",
});

const overdue = {
  key: "ORDER_OVERDUE:o-1",
  at: at("2026-10-02T08:00:00"),
  title: "Overdue",
  body: `ORD-1028 for Priya Menon was due on ${formatDayMonth("2026-10-01")}.`,
  url: "/orders/o-1",
};

describe("remindersFor (the inbox's rule, 0023)", () => {
  it("tells of an order due soon the morning before, and of it overdue the morning after", () => {
    expect(remindersFor(order(), ist("2026-09-29T10:00:00"))).toEqual([
      dueSoon("2026-09-30T08:00:00", "tomorrow"),
      overdue,
    ]);
  });

  it("tells of it that morning instead, once the morning before has gone", () => {
    expect(remindersFor(order(), ist("2026-09-30T09:00:00"))).toEqual([dueSoon("2026-10-01T08:00:00", "today"), overdue]);
  });

  it("sets only what is still ahead: the inbox tells the rest as the app is open", () => {
    expect(remindersFor(order(), ist("2026-10-01T09:00:00"))).toEqual([overdue]);
    expect(remindersFor(order(), ist("2026-10-02T08:00:00"))).toEqual([]);
  });

  it("does not tell again what the inbox has told", () => {
    const now = ist("2026-09-29T10:00:00");
    expect(remindersFor(order({ due_notified_at: at("2026-09-29T09:00:00") }), now)).toEqual([overdue]);
    expect(remindersFor(order({ overdue_notified_at: at("2026-09-29T09:00:00") }), now)).toEqual([
      dueSoon("2026-09-30T08:00:00", "tomorrow"),
    ]);
  });

  it("names a guest's order as its bill does, and sets nothing for an order with no day", () => {
    const [first] = remindersFor(order({ customers: null }), ist("2026-09-29T10:00:00"));
    expect(first.body).toBe("ORD-1028 for Guest is due tomorrow.");
    expect(remindersFor(order({ delivery_date: "" }), ist("2026-09-29T10:00:00"))).toEqual([]);
  });

  it("counts the day in India wherever the server is: due just after midnight there is the next day", () => {
    const early = order({ delivery_date: "2026-09-30T19:00:00Z" }); // 00:30 on 1 October in India
    expect(remindersFor(early, ist("2026-09-29T10:00:00"))[0].at).toBe(at("2026-09-30T08:00:00"));
  });
});

describe("listReminders", () => {
  it("reads the business's open orders due from yesterday on, soonest first, and words each one's reminders", async () => {
    const fake = fakeSupabase(() => ({ data: [order()] }));
    const reminders = await listReminders(tenantOf(fake.client), ist("2026-09-29T10:00:00"));

    expect(reminders).toEqual([dueSoon("2026-09-30T08:00:00", "tomorrow"), overdue]);
    const [query] = fake.queries;
    expect(query.table).toBe("orders");
    expect(fake.argsOf(query, "eq")).toEqual([["bakery_id", "b-1"]]);
    expect(fake.argsOf(query, "in")).toEqual([["status", [...OPEN_STATUSES]]]);
    expect(fake.argsOf(query, "gte")).toEqual([["delivery_date", at("2026-09-28T00:00:00")]]);
    expect(fake.argsOf(query, "order")).toEqual([
      ["delivery_date", { ascending: true }],
      ["id", { ascending: true }],
    ]);
    expect(fake.argsOf(query, "limit")).toEqual([[REMINDER_ORDERS_MAX]]);
  });

  it("answers none when there are none, and a failure as the app's own", async () => {
    const empty = fakeSupabase(() => ({ data: null }));
    expect(await listReminders(tenantOf(empty.client))).toEqual([]);
    const failing = fakeSupabase(() => ({ error: { code: "57014", message: "canceling statement" } }));
    await expect(listReminders(tenantOf(failing.client))).rejects.toBeInstanceOf(AppError);
  });
});
