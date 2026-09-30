import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SWEEP_INTERVAL_MS } from "@/constants/jobs";
import { DUE_NOTICE_FROM_HOUR } from "@/constants/limits";
import { UI_TEXT } from "@/constants/messages";
import { fakeSupabase } from "@tests/support/supabase";
import { tenantOf } from "@tests/support/tenant";

const { rpc, devices, pushToBusiness, countUnread, listNotifications, recordNotification, logger, captureError, mode } =
  vi.hoisted(() => ({
    rpc: vi.fn(),
    devices: { rows: [] as { id: string; bakery_id: string }[], from: undefined as unknown },
    pushToBusiness: vi.fn(),
    countUnread: vi.fn(),
    listNotifications: vi.fn(),
    recordNotification: vi.fn(),
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    captureError: vi.fn(),
    // Whether a worker runs (WORKER_ENABLED): none for now, and each path is kept.
    mode: { worker: false },
  }));
vi.mock("@/constants/jobs", async (original) => ({
  ...(await original<typeof import("@/constants/jobs")>()),
  get WORKER_ENABLED() {
    return mode.worker;
  },
}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServiceRoleClient: () => ({ rpc, from: devices.from }) }));
vi.mock("@/features/notifications/api", () => ({ countUnread, listNotifications, recordNotification }));
vi.mock("@/features/notifications/push", () => ({ pushToBusiness }));
vi.mock("@/lib/logger", () => ({ logger }));
vi.mock("@/lib/audit/errorLog", () => ({ captureError }));

const { checkDueOrders, countUnreadAfterDue, listNotificationsAfterDue, sweepDueOrders } =
  await import("@/features/notifications/due");

const ORDER = "7c1f3a52-9d7e-4b1a-8a51-0f1d2c3b4a5e";
const LATE = "7c1f3a52-9d7e-4b1a-8a51-0f1d2c3b4a5f";

const dueRows = [
  {
    kind: "ORDER_DUE",
    order_id: ORDER,
    order_number: "ORD-1028",
    customer_name: "Priya Menon",
    due_day: "TODAY",
    due_date: null,
  },
  {
    kind: "ORDER_OVERDUE",
    order_id: LATE,
    order_number: "ORD-1020",
    customer_name: null,
    due_day: null,
    due_date: "2026-09-26",
  },
];

// Each test looks at a business of its own: a business is looked at once a minute at most.
let business = 0;
const nextTenant = () => tenantOf({}, { bakeryId: `b-${(business += 1)}` });

beforeEach(() => {
  vi.clearAllMocks();
  mode.worker = false;
  rpc.mockResolvedValue({ data: dueRows, error: null });
  recordNotification.mockResolvedValue(undefined);
  pushToBusiness.mockResolvedValue({ sent: 0, gone: 0 });
  devices.rows = [];
  const fake = fakeSupabase(() => ({ data: devices.rows }));
  devices.from = fake.client.from.bind(fake.client);
  countUnread.mockResolvedValue({ unread: 2 });
  listNotifications.mockResolvedValue({ items: [], nextCursor: null });
});

afterEach(() => vi.useRealTimers());

describe("checkDueOrders", () => {
  it("takes the business's orders due, from its morning, and writes each in the app's words, leading to its order", async () => {
    const tenant = nextTenant();
    await checkDueOrders(tenant);

    expect(rpc).toHaveBeenCalledWith("take_due_order_notices", {
      p_bakery_id: tenant.bakeryId,
      p_from_hour: DUE_NOTICE_FROM_HOUR,
    });
    expect(recordNotification).toHaveBeenCalledTimes(2);
    expect(recordNotification).toHaveBeenNthCalledWith(1, expect.anything(), {
      id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      bakeryId: tenant.bakeryId,
      kind: "ORDER",
      text: {
        title: UI_TEXT.notifications.orderDueTitle,
        body: UI_TEXT.notifications.orderDueBody("ORD-1028", "Priya Menon", "today"),
      },
      actionUrl: `/orders/${ORDER}`,
    });
    expect(recordNotification).toHaveBeenNthCalledWith(2, expect.anything(), {
      id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      bakeryId: tenant.bakeryId,
      kind: "ORDER",
      text: {
        title: UI_TEXT.notifications.orderOverdueTitle,
        body: UI_TEXT.notifications.orderOverdueBody("ORD-1020", UI_TEXT.customerPicker.guest, "26 Sep"),
      },
      actionUrl: `/orders/${LATE}`,
    });
  });

  it("pushes what it wrote to the business's browsers that want it, after the inbox has it (R8.6)", async () => {
    const tenant = nextTenant();
    await checkDueOrders(tenant);

    expect(pushToBusiness).toHaveBeenCalledOnce();
    expect(pushToBusiness).toHaveBeenCalledWith(expect.anything(), tenant.bakeryId, [
      { kind: "ORDER_DUE", orderId: ORDER, orderNumber: "ORD-1028", customerName: "Priya Menon", day: "TODAY" },
      { kind: "ORDER_OVERDUE", orderId: LATE, orderNumber: "ORD-1020", customerName: null, dueDate: "2026-09-26" },
    ]);
    expect(recordNotification.mock.invocationCallOrder[1]).toBeLessThan(pushToBusiness.mock.invocationCallOrder[0]);
  });

  it("leaves out a row it cannot put into words, and writes nothing when nothing is due", async () => {
    rpc.mockResolvedValueOnce({ data: [{ ...dueRows[0], due_day: "NEXT_WEEK" }], error: null });
    await checkDueOrders(nextTenant());
    rpc.mockResolvedValueOnce({ data: null, error: null });
    await checkDueOrders(nextTenant());
    expect(recordNotification).not.toHaveBeenCalled();
  });

  it("looks at a business once a minute at most, and a read meanwhile waits for the look in hand", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const tenant = nextTenant();
    let finish: (value: unknown) => void = () => {};
    rpc.mockReturnValueOnce(new Promise((resolve) => (finish = resolve)));

    const first = checkDueOrders(tenant);
    const second = checkDueOrders(tenant);
    let waited = false;
    void second.then(() => (waited = true));
    await Promise.resolve();
    expect(waited).toBe(false);
    finish({ data: [], error: null });
    await Promise.all([first, second]);
    expect(waited).toBe(true);
    expect(rpc).toHaveBeenCalledOnce();

    await checkDueOrders(nextTenant());
    expect(rpc).toHaveBeenCalledTimes(2);

    vi.setSystemTime(Date.now() + SWEEP_INTERVAL_MS);
    await checkDueOrders(tenant);
    expect(rpc).toHaveBeenCalledTimes(3);
  });

  it("logs a look that fails, and never fails the read it came with", async () => {
    const tenant = nextTenant();
    rpc.mockResolvedValueOnce({ data: null, error: { code: "08006", message: "connection lost" } });
    await expect(countUnreadAfterDue(tenant)).resolves.toEqual({ unread: 2 });
    expect(captureError).toHaveBeenCalledWith({
      message: "Could not look for orders due",
      error: expect.anything(),
      bakeryId: tenant.bakeryId,
    });

    const other = nextTenant();
    rpc.mockRejectedValueOnce("offline");
    await checkDueOrders(other);
    expect(captureError).toHaveBeenLastCalledWith({
      message: "Could not look for orders due",
      error: "offline",
      bakeryId: other.bakeryId,
    });
  });

  it("looks for nothing when a worker runs: its own sweep tells of them", async () => {
    mode.worker = true;
    await checkDueOrders(nextTenant());
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("sweepDueOrders (the database's scheduler, R8.6)", () => {
  it("looks at each business with a browser that wants pushes, once however many browsers it has", async () => {
    devices.rows = [
      { id: "d-1", bakery_id: "b-sweep-1" },
      { id: "d-2", bakery_id: "b-sweep-1" },
      { id: "d-3", bakery_id: "b-sweep-2" },
    ];
    await expect(sweepDueOrders()).resolves.toEqual({ businesses: 2 });
    expect(rpc.mock.calls.map(([, args]) => args.p_bakery_id)).toEqual(["b-sweep-1", "b-sweep-2"]);
    expect(pushToBusiness).toHaveBeenCalledTimes(2);
  });

  it("looks at nothing when no browser wants pushes, or when a worker runs", async () => {
    await expect(sweepDueOrders()).resolves.toEqual({ businesses: 0 });
    mode.worker = true;
    devices.rows = [{ id: "d-1", bakery_id: "b-sweep-3" }];
    await expect(sweepDueOrders()).resolves.toEqual({ businesses: 0 });
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("the bell and the inbox", () => {
  it("count the unread once the orders due are written", async () => {
    const tenant = nextTenant();
    await expect(countUnreadAfterDue(tenant)).resolves.toEqual({ unread: 2 });
    expect(recordNotification.mock.invocationCallOrder[1]).toBeLessThan(countUnread.mock.invocationCallOrder[0]);
    expect(countUnread).toHaveBeenCalledWith(tenant);
  });

  it("list the inbox once the orders due are written", async () => {
    const tenant = nextTenant();
    await expect(listNotificationsAfterDue(tenant, { tab: "ORDERS" })).resolves.toEqual({
      items: [],
      nextCursor: null,
    });
    expect(recordNotification.mock.invocationCallOrder[1]).toBeLessThan(listNotifications.mock.invocationCallOrder[0]);
    expect(listNotifications).toHaveBeenCalledWith(tenant, { tab: "ORDERS" });
  });
});
