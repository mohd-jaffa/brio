import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CustomersClient } from "@/features/customers/api.client";
import type { Customer } from "@/features/customers/types";
import { OrdersClient } from "@/features/orders/api.client";
import { EditOrder } from "@/features/orders/components/EditOrder";
import type { Order } from "@/features/orders/types";
import type { Product } from "@/features/products/types";
import { ApiError } from "@/lib/api/client";
import { startNavigation } from "@/lib/navigation/pending";

import { anOrder } from "@tests/support/orders";
import { Providers } from "@tests/support/providers";

/** The address bar: `?step=` is read from it, and `pushUrl` changes it. */
const nav = vi.hoisted(() => {
  let query = "";
  const listeners = new Set<() => void>();
  return {
    push: vi.fn((url: string) => {
      query = url.split("?")[1] ?? "";
      for (const listener of listeners) listener();
    }),
    set: (next: string) => {
      query = next;
    },
    read: () => query,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
});
const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));

vi.mock("next/navigation", async () => {
  const { useSyncExternalStore } = await import("react");
  return {
    useRouter: () => router,
    useSearchParams: () => new URLSearchParams(useSyncExternalStore(nav.subscribe, nav.read, nav.read)),
  };
});
vi.mock("@/lib/navigation/url", () => ({ pushUrl: nav.push }));
vi.mock("@/lib/navigation/pending", () => ({ startNavigation: vi.fn() }));

const fetcher = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/client", async (original) => ({
  ...(await original<typeof import("@/lib/api/client")>()),
  fetcher,
}));
vi.mock("@/features/orders/api.client", () => ({ OrdersClient: { updateOrder: vi.fn() } }));
vi.mock("@/features/customers/api.client", () => ({
  CustomersClient: { get: vi.fn(), createCustomer: vi.fn(), updateCustomer: vi.fn() },
}));

const CAKE = "3f2504e0-4f89-11d3-9a0c-0305e82c3301";
const BREAD = "3f2504e0-4f89-11d3-9a0c-0305e82c3303";
const LINE = "3f2504e0-4f89-11d3-9a0c-0305e82c3310";
const TOPPER = "3f2504e0-4f89-11d3-9a0c-0305e82c3311";

const product = (id: string, name: string, defaultPrice: number, isActive = true): Product => ({
  id,
  name,
  defaultPrice,
  unit: "piece",
  isActive,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
});
// The cake costs ₹1,250 now; the order has it at ₹1,000.
const products = [product(CAKE, "Chocolate truffle cake", 125000), product(BREAD, "Sourdough", 25000)];

const meena: Customer = {
  id: "c1111111-1111-4111-8111-111111111111",
  name: "Meena Gupta",
  phone: "+919876543210",
  address: "12 Baker Lane",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};
const rahul: Customer = { ...meena, id: "c2222222-2222-4222-8222-222222222222", name: "Rahul", phone: "+919812345678" };

function theOrder(changes: Partial<Order> = {}): Order {
  return anOrder({
    customerId: meena.id,
    status: "IN_PROGRESS",
    payment: { status: "PARTIALLY_PAID", paid: 50000 },
    pricing: { subtotal: 115000, discount: 0, deliveryCharge: 0, tax: 0, total: 115000 },
    delivery: { type: "DELIVERY", date: "2099-09-27T08:30:00.000Z", address: "12 Baker Lane" },
    items: [
      {
        id: LINE,
        productId: CAKE,
        custom: false,
        productName: "Truffle cake",
        unitPrice: 100000,
        quantity: 1,
        subtotal: 100000,
      },
      { id: TOPPER, custom: true, productName: "Name topper", unitPrice: 15000, quantity: 1, subtotal: 15000 },
    ],
    adjustments: [],
    ...changes,
  });
}

/** What the API answers for each read; an Error is thrown, a function answers per call. */
let answers: Record<string, unknown>;

function open(query = "", order: Order = theOrder()) {
  answers["/api/orders/o-1"] = order;
  nav.set(query);
  return render(<EditOrder id="o-1" />, { wrapper: Providers });
}

const button = (name: string | RegExp) => screen.getByRole("button", { name });
const card = () => screen.getByRole("alertdialog");
/** The order's line for the cake, there once the order and its customer are read. */
const ready = () => screen.findByRole("button", { name: "Remove Truffle cake" });
const saveButton = () => screen.getAllByRole("button", { name: "Save changes" })[0];

beforeEach(() => {
  answers = {
    "/api/products": products,
    [`/api/customers/${meena.id}`]: meena,
  };
  fetcher.mockImplementation(async (key: string) => {
    const answer = key in answers ? answers[key] : { items: [meena, rahul], nextCursor: null };
    if (answer instanceof Error) throw answer;
    return typeof answer === "function" ? answer() : answer;
  });
  vi.mocked(OrdersClient.updateOrder).mockResolvedValue(theOrder());
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  Reflect.deleteProperty(window, "matchMedia");
});

describe("EditOrder: arriving", () => {
  it("holds its place while the order and its customer are read, then shows the order as it stands", async () => {
    let customerArrives: (customer: Customer) => void = () => {};
    answers[`/api/customers/${meena.id}`] = () => new Promise<Customer>((resolve) => (customerArrives = resolve));
    open();
    expect(screen.getByRole("status", { name: "Loading order" })).toBeInTheDocument();
    // The order is read, but the draft waits for who it is for.
    await waitFor(() => expect(fetcher).toHaveBeenCalledWith(`/api/customers/${meena.id}`));
    expect(screen.getByRole("status", { name: "Loading order" })).toBeInTheDocument();

    customerArrives(meena);
    await ready();
    expect(screen.getAllByRole("heading", { name: "Edit ORD-1006", level: 1 }).length).toBeGreaterThan(0);
    expect(button("Customer: Meena Gupta. Change")).toBeInTheDocument();
    // The kept line at its own price, not today's.
    expect(screen.getAllByText("₹1,000").length).toBeGreaterThan(0);
    expect(screen.getByText("2 items")).toBeInTheDocument();
  });

  it("says when the order could not be read, and tries again", async () => {
    let calls = 0;
    answers["/api/orders/o-1"] = () => {
      calls += 1;
      if (calls === 1) throw new ApiError(500, "INTERNAL_ERROR", "Something went wrong.", "req_1");
      return theOrder();
    };
    nav.set("");
    render(<EditOrder id="o-1" />, { wrapper: Providers });
    expect(await screen.findByText("Something went wrong.")).toBeInTheDocument();
    await userEvent.click(button("Try again"));
    await ready();
  });

  it("says when the customer could not be read, and tries again", async () => {
    let calls = 0;
    answers[`/api/customers/${meena.id}`] = () => {
      calls += 1;
      if (calls === 1) throw new ApiError(500, "INTERNAL_ERROR", "No customer.", "req_2");
      return meena;
    };
    open();
    expect(await screen.findByText("No customer.")).toBeInTheDocument();
    await userEvent.click(button("Try again"));
    await ready();
  });

  it("reads no customer for a Guest order", async () => {
    open("", theOrder({ customerId: null }));
    await ready();
    expect(button("Customer: Guest. Change")).toBeInTheDocument();
    expect(fetcher).not.toHaveBeenCalledWith(expect.stringContaining("/api/customers/"));
  });

  it("will not change a finished order, and leads back to it", async () => {
    open("", theOrder({ status: "DELIVERED" }));
    expect(await screen.findByText("This order is finished, so it can’t be changed.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to the order" })).toHaveAttribute("href", "/orders/o-1");
    expect(screen.queryByRole("button", { name: "Save changes" })).not.toBeInTheDocument();
  });
});

describe("EditOrder: items", () => {
  it("adds from the grid at today's price, takes one off, and moves on to the details", async () => {
    open();
    await ready();
    await userEvent.click(button("Add Sourdough"));
    expect(screen.getByText("3 items")).toBeInTheDocument();
    await userEvent.click(button("Remove one Sourdough"));
    expect(screen.getByText("2 items")).toBeInTheDocument();
    // The cake already on the order goes up at its own price.
    await userEvent.click(button("Add Chocolate truffle cake"));
    expect(screen.getAllByText("₹2,150").length).toBeGreaterThan(0);

    await userEvent.click(button("Continue to order details"));
    expect(nav.push).toHaveBeenCalledWith("/orders/o-1/edit?step=details");
  });

  it("adds a custom item from its sheet", async () => {
    open();
    await ready();
    await userEvent.click(button(/Add custom item/));
    const sheet = await screen.findByRole("dialog", { name: "Custom item" });
    await userEvent.type(within(sheet).getByLabelText(/Item name/), "Candles");
    await userEvent.type(within(sheet).getByLabelText(/Amount/), "50");
    await userEvent.click(within(sheet).getByRole("button", { name: /Add/ }));
    await waitFor(() => expect(screen.getByText("3 items")).toBeInTheDocument());
  });

  it("will not move on while a line has something to put right", async () => {
    open(
      "",
      theOrder({
        items: [
          {
            id: "not-an-id",
            productId: CAKE,
            custom: false,
            productName: "Truffle cake",
            unitPrice: 100000,
            quantity: 1,
            subtotal: 100000,
          },
        ],
      }),
    );
    await ready();
    await userEvent.click(button("Continue to order details"));
    expect(nav.push).not.toHaveBeenCalled();
  });

  it("goes back to the order from the items, and to the items from the details", async () => {
    const { unmount } = open();
    await ready();
    expect(screen.getAllByRole("link", { name: "Go back" })[0]).toHaveAttribute("href", "/orders/o-1");
    unmount();

    open("step=details");
    await ready();
    expect(screen.getAllByRole("link", { name: "Go back" })[0]).toHaveAttribute("href", "/orders/o-1/edit");
    await userEvent.click(button("Add more items"));
    expect(nav.push).toHaveBeenCalledWith("/orders/o-1/edit");
  });
});

describe("EditOrder: details and saving", () => {
  it("shows what has been paid so far, and the balance the changes leave", async () => {
    open("step=details");
    await ready();
    const summary = screen.getByRole("region", { name: "Order summary" });
    expect(summary).toHaveTextContent("Paid so far₹500");
    expect(summary).toHaveTextContent("Balance due₹650");
  });

  it("saves the whole order as it now stands, says so, and goes back to it", async () => {
    open("step=details");
    await ready();
    await userEvent.click(
      within(screen.getAllByRole("listitem").find((item) => item.textContent?.includes("Truffle cake"))!).getByRole(
        "button",
        { name: "Increase" },
      ),
    );
    await userEvent.click(saveButton());

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/orders/o-1"));
    expect(startNavigation).toHaveBeenCalled();
    expect(OrdersClient.updateOrder).toHaveBeenCalledWith("o-1", {
      customer: { kind: "CUSTOMER", id: meena.id },
      items: [
        { itemId: LINE, productId: CAKE, quantity: 2, notes: null },
        { itemId: TOPPER, custom: { name: "Name topper", unitPrice: 15000 }, quantity: 1, notes: null },
      ],
      adjustments: [],
      delivery: {
        type: "DELIVERY",
        date: new Date("2099-09-27T08:30:00.000Z").toISOString(),
        address: "12 Baker Lane",
        googleMapsLink: null,
      },
      notes: null,
    });
    expect(await screen.findByText("Order updated")).toBeInTheDocument();
    expect(screen.getByText("ORD-1006 is saved with its changes.")).toBeInTheDocument();
  });

  it("will not save an order with nothing in it", async () => {
    open("step=details");
    await ready();
    await userEvent.click(button("Remove Truffle cake"));
    await userEvent.click(button("Remove Name topper"));
    expect(saveButton()).toBeDisabled();
  });

  it("sends a phone back to the first step with something to put right, and keeps a wide screen where it is", async () => {
    const broken = theOrder({
      items: [
        {
          id: "not-an-id",
          productId: CAKE,
          custom: false,
          productName: "Truffle cake",
          unitPrice: 100000,
          quantity: 1,
          subtotal: 100000,
        },
      ],
    });
    const { unmount } = open("step=details", broken);
    await ready();
    await userEvent.click(saveButton());
    expect(nav.push).toHaveBeenCalledWith("/orders/o-1/edit");
    expect(OrdersClient.updateOrder).not.toHaveBeenCalled();
    unmount();
    nav.push.mockClear();

    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
    open("step=details", theOrder({ delivery: { type: "DELIVERY", date: "2099-09-27T08:30:00.000Z" } }));
    await ready();
    await userEvent.click(saveButton());
    expect(nav.push).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/Delivery address/)).toHaveAttribute("aria-invalid", "true");
  });

  it("stays on the details when that is what needs putting right", async () => {
    open("step=details", theOrder({ delivery: { type: "DELIVERY", date: "2099-09-27T08:30:00.000Z" } }));
    await ready();
    await userEvent.click(saveButton());
    expect(nav.push).not.toHaveBeenCalled();
    expect(OrdersClient.updateOrder).not.toHaveBeenCalled();
  });

  it("names what is short when the stock refuses, with nothing to try again", async () => {
    vi.mocked(OrdersClient.updateOrder).mockRejectedValue(
      new ApiError(422, "ORDER_INSUFFICIENT_STOCK", "Not enough stock.", "req_3", {
        shortfalls: [{ productId: CAKE, name: "Chocolate truffle cake", requested: 3, available: 2 }],
      }),
    );
    open("step=details");
    await ready();
    await userEvent.click(saveButton());
    const refused = await screen.findByRole("alertdialog", { name: "Changes not saved" });
    expect(refused).toHaveTextContent("Only 2 left of Chocolate truffle cake.");
    expect(within(refused).queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("reports any other refusal in the API's words, and tries the same again", async () => {
    vi.mocked(OrdersClient.updateOrder)
      .mockRejectedValueOnce(new ApiError(422, "ORDER_TOTAL_BELOW_PAID", "More has been paid.", "req_4"))
      .mockResolvedValueOnce(theOrder());
    open("step=details");
    await ready();
    await userEvent.click(saveButton());
    expect(await screen.findByRole("alertdialog", { name: "Changes not saved" })).toHaveTextContent(
      "More has been paid.",
    );
    await userEvent.click(within(card()).getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/orders/o-1"));
    expect(OrdersClient.updateOrder).toHaveBeenCalledTimes(2);
  });
});

describe("EditOrder: who it is for", () => {
  it("chooses someone else, or a Guest, from the picker", async () => {
    open("step=details");
    await ready();
    await userEvent.click(button("Customer: Meena Gupta. Change"));
    expect(screen.getByRole("radio", { name: /Meena Gupta/ })).toHaveAttribute("aria-checked", "true");
    await userEvent.click(await screen.findByRole("radio", { name: /Rahul/ }));
    expect(button("Customer: Rahul. Change")).toBeInTheDocument();
    await userEvent.click(button("Customer: Rahul. Change"));
    await userEvent.click(screen.getByRole("radio", { name: /Guest/ }));
    expect(button("Customer: Guest. Change")).toBeInTheDocument();
    await userEvent.click(button("Customer: Guest. Change"));
    expect(screen.getByRole("radio", { name: /Guest/ })).toHaveAttribute("aria-checked", "true");
  });

  it("makes a new customer on the spot and chooses them, from the button or the picker", async () => {
    vi.mocked(CustomersClient.createCustomer).mockResolvedValue({ ...rahul, id: "c-new", name: "Anu" });
    open("step=details");
    await ready();
    await userEvent.click(button("Customer: Meena Gupta. Change"));
    await userEvent.click(button("Add new customer"));
    await userEvent.click(await screen.findByRole("button", { name: "Close" }));
    await userEvent.click(button("New customer"));
    const sheet = screen.getByRole("dialog", { name: "New customer" });
    await userEvent.type(within(sheet).getByLabelText(/Full name/), "Anu");
    await userEvent.type(within(sheet).getByLabelText(/Phone number/), "9000000001");
    await userEvent.click(within(sheet).getByRole("button", { name: "Save customer" }));
    await waitFor(() => expect(button("Customer: Anu. Change")).toBeInTheDocument());
  });

  it("chooses the customer who already has the number, and says so when they cannot be read", async () => {
    vi.mocked(CustomersClient.createCustomer).mockRejectedValue(
      new ApiError(409, "CUSTOMER_PHONE_ALREADY_EXISTS", "Taken", "req_5", { customerId: rahul.id, name: "Rahul" }),
    );
    vi.mocked(CustomersClient.get).mockResolvedValueOnce(rahul).mockRejectedValueOnce(new Error("offline"));
    open("step=details");
    await ready();

    const useExisting = async () => {
      await userEvent.click(button("New customer"));
      await userEvent.type(await screen.findByLabelText(/Full name/), "Rahul");
      await userEvent.type(screen.getByLabelText(/Phone number/), "9812345678");
      await userEvent.click(button("Save customer"));
      await userEvent.click(
        within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Use that customer" }),
      );
    };

    await useExisting();
    await waitFor(() => expect(button("Customer: Rahul. Change")).toBeInTheDocument());

    await useExisting();
    expect(await screen.findByRole("alertdialog", { name: "Customer not chosen" })).toBeInTheDocument();
    expect(button("Customer: Rahul. Change")).toBeInTheDocument();
  });
});
