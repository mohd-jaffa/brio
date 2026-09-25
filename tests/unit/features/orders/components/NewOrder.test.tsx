import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CustomersClient } from "@/features/customers/api.client";
import type { Customer } from "@/features/customers/types";
import { OrdersClient } from "@/features/orders/api.client";
import { NewOrder } from "@/features/orders/components/NewOrder";
import { addProduct, chooseCustomer, newDraft, setPayment, type OrderDraft } from "@/features/orders/draft";
import type { Order } from "@/features/orders/types";
import type { Product } from "@/features/products/types";
import { ApiError } from "@/lib/api/client";
import { clearUserItems } from "@/lib/storage/userStorage";

import { Providers } from "@tests/support/providers";

/** The address bar: `?step=` is read from it, and push and replace change it. */
const nav = vi.hoisted(() => {
  let query = "";
  const listeners = new Set<() => void>();
  const go = (url: string) => {
    query = url.split("?")[1] ?? "";
    for (const listener of listeners) listener();
  };
  return {
    router: { push: vi.fn(go), replace: vi.fn(go) },
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

vi.mock("next/navigation", async () => {
  const { useSyncExternalStore } = await import("react");
  return {
    useRouter: () => nav.router,
    useSearchParams: () => new URLSearchParams(useSyncExternalStore(nav.subscribe, nav.read, nav.read)),
  };
});

const auth = vi.hoisted(() => ({ profile: { id: "u-1" } as { id: string } | null }));
vi.mock("@/features/auth/AuthProvider", () => ({ useAuth: () => ({ profile: auth.profile }) }));

const fetcher = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/client", async (original) => ({
  ...(await original<typeof import("@/lib/api/client")>()),
  fetcher,
}));
vi.mock("@/features/orders/api.client", () => ({ OrdersClient: { createOrder: vi.fn() } }));
vi.mock("@/features/customers/api.client", () => ({
  CustomersClient: { get: vi.fn(), createCustomer: vi.fn(), updateCustomer: vi.fn() },
}));

const product = (id: string, name: string, defaultPrice: number, isActive = true): Product => ({
  id,
  name,
  defaultPrice,
  unit: "piece",
  isActive,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
});
const CAKE = "3f2504e0-4f89-11d3-9a0c-0305e82c3301";
const products = [product(CAKE, "Chocolate truffle cake", 125000), product("p-old", "Old loaf", 5000, false)];

const meena: Customer = {
  id: "c1111111-1111-4111-8111-111111111111",
  name: "Meena Gupta",
  phone: "+919876543210",
  address: "12 Baker Lane",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};
const rahul: Customer = {
  ...meena,
  id: "c2222222-2222-4222-8222-222222222222",
  name: "Rahul",
  phone: "+919812345678",
  address: undefined,
};

const placed = { id: "o-1", orderNumber: "ORD-1001", pricing: { total: 125000 } } as Order;

function store(draft: OrderDraft) {
  localStorage.setItem("ovenly_user:u-1:order_draft", JSON.stringify(draft));
}

function open(query = "") {
  nav.set(query);
  return render(<NewOrder />, { wrapper: Providers });
}

const withCake = () => addProduct(newDraft(), CAKE);
const button = (name: string | RegExp) => screen.getByRole("button", { name });
const card = () => screen.getByRole("alertdialog");
/** The order's line for the cake: there once the products have loaded. */
const loaded = () => screen.findByRole("button", { name: "Remove Chocolate truffle cake" });

beforeEach(() => {
  auth.profile = { id: "u-1" };
  fetcher.mockImplementation(async (key: string) => (key === "/api/products" ? products : [meena, rahul]));
});

afterEach(() => {
  // Unmounted first, or the screen would read a fresh draft back into memory.
  cleanup();
  clearUserItems();
  localStorage.clear();
  vi.clearAllMocks();
  Reflect.deleteProperty(window, "matchMedia");
});

describe("NewOrder: items", () => {
  it("waits until it knows who is signed in", () => {
    auth.profile = null;
    open();
    expect(screen.getByRole("status", { name: "Create order" })).toHaveAttribute("aria-busy", "true");
  });

  it("offers what is on sale, adds it, and moves on to the details", async () => {
    open();
    await userEvent.click(await screen.findByRole("button", { name: "Add Chocolate truffle cake" }));
    await userEvent.click(button("Add Chocolate truffle cake"));
    expect(screen.queryByRole("button", { name: "Add Old loaf" })).not.toBeInTheDocument();
    expect(screen.getByText("2 items")).toBeInTheDocument();
    expect(screen.getAllByText("₹2,500").length).toBeGreaterThan(0);

    await userEvent.click(button("Continue to order details"));
    expect(nav.router.push).toHaveBeenCalledWith("/orders/new?step=details");
    expect(screen.getAllByRole("heading", { name: "Order details" }).length).toBeGreaterThan(0);
  });

  it("adds a custom item from its sheet", async () => {
    open();
    await userEvent.click(await screen.findByRole("button", { name: /Add custom item.*special requests/ }));
    const sheet = screen.getByRole("dialog", { name: "Custom item" });
    await userEvent.type(within(sheet).getByLabelText(/Item name/), "Name topper");
    await userEvent.type(within(sheet).getByLabelText(/Amount/), "150");
    await userEvent.click(within(sheet).getByRole("button", { name: "Add custom item" }));

    await waitFor(() => expect(screen.getByText("1 item")).toBeInTheDocument());
    expect(screen.getByText("Name topper")).toBeInTheDocument();
  });
});

describe("NewOrder: details", () => {
  it("will not go on to payment without a customer, and does once one is chosen", async () => {
    store(withCake());
    open("step=details");
    await userEvent.click(button("Proceed to payment"));
    expect(nav.router.push).not.toHaveBeenCalled();
    expect(button("Choose a customer")).toHaveAccessibleDescription("Choose a customer.");

    await userEvent.click(button("Choose a customer"));
    await userEvent.click(await screen.findByRole("radio", { name: /Meena Gupta/ }));
    expect(button("Customer: Meena Gupta. Change")).toBeInTheDocument();
    await userEvent.click(button("Proceed to payment"));
    expect(nav.router.push).toHaveBeenCalledWith("/orders/new?step=payment");
    expect(screen.getAllByRole("heading", { name: "Payment" }).length).toBeGreaterThan(0);
  });

  it("marks the current choice in the picker, a Guest or a customer", async () => {
    store(chooseCustomer(withCake(), { kind: "GUEST" }));
    open("step=details");
    await userEvent.click(button("Customer: Guest. Change"));
    expect(screen.getByRole("radio", { name: /Guest/ })).toHaveAttribute("aria-checked", "true");
    await userEvent.click(await screen.findByRole("radio", { name: /Rahul/ }));
    await userEvent.click(button("Customer: Rahul. Change"));
    expect(screen.getByRole("radio", { name: /Rahul/ })).toHaveAttribute("aria-checked", "true");
    await userEvent.click(screen.getByRole("radio", { name: /Guest/ }));
    expect(button("Customer: Guest. Change")).toBeInTheDocument();
  });

  it("goes back to the grid for more items", async () => {
    store(withCake());
    open("step=details");
    await userEvent.click(button("Add more items"));
    expect(nav.router.push).toHaveBeenCalledWith("/orders/new");
  });

  it("makes a new customer on the spot and chooses them, from the button or the picker", async () => {
    vi.mocked(CustomersClient.createCustomer).mockResolvedValue({ ...rahul, id: "c-new", name: "Anu" });
    store(withCake());
    open("step=details");

    await userEvent.click(button("Choose a customer"));
    await userEvent.click(button("Add new customer"));
    await userEvent.click(button("Close"));
    await userEvent.click(button("New customer"));
    const sheet = screen.getByRole("dialog", { name: "New Customer" });
    await userEvent.type(within(sheet).getByLabelText(/Full Name/), "Anu");
    await userEvent.type(within(sheet).getByLabelText(/Phone Number/), "9000000001");
    await userEvent.click(within(sheet).getByRole("button", { name: "Save Customer" }));

    await waitFor(() => expect(button("Customer: Anu. Change")).toBeInTheDocument());
  });

  it("chooses the customer who already has the number (§139.6)", async () => {
    vi.mocked(CustomersClient.createCustomer).mockRejectedValue(
      new ApiError(409, "CUSTOMER_PHONE_ALREADY_EXISTS", "Taken", "req_1", {
        customerId: meena.id,
        name: "Meena Gupta",
      }),
    );
    vi.mocked(CustomersClient.get).mockResolvedValue(meena);
    store(withCake());
    open("step=details");

    await userEvent.click(button("New customer"));
    await userEvent.type(screen.getByLabelText(/Full Name/), "Meena");
    await userEvent.type(screen.getByLabelText(/Phone Number/), "9876543210");
    await userEvent.click(button("Save Customer"));
    await userEvent.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Use that customer" }),
    );

    await waitFor(() => expect(button("Customer: Meena Gupta. Change")).toBeInTheDocument());
    expect(CustomersClient.get).toHaveBeenCalledWith(meena.id);
  });

  it("says so when that customer cannot be read", async () => {
    vi.mocked(CustomersClient.createCustomer).mockRejectedValue(
      new ApiError(409, "CUSTOMER_PHONE_ALREADY_EXISTS", "Taken", "req_1", {
        customerId: meena.id,
        name: "Meena Gupta",
      }),
    );
    vi.mocked(CustomersClient.get).mockRejectedValue(new Error("offline"));
    store(withCake());
    open("step=details");

    await userEvent.click(button("New customer"));
    await userEvent.type(screen.getByLabelText(/Full Name/), "Meena");
    await userEvent.type(screen.getByLabelText(/Phone Number/), "9876543210");
    await userEvent.click(button("Save Customer"));
    await userEvent.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Use that customer" }),
    );

    expect(await screen.findByRole("alertdialog", { name: "Customer not chosen" })).toHaveTextContent(
      "Could not load this customer.",
    );
    expect(button("Choose a customer")).toBeInTheDocument();
  });
});

describe("NewOrder: payment and placing", () => {
  const ready = (draft = withCake()) => chooseCustomer(draft, { kind: "GUEST" });

  it("shows what is paid now as the payment is chosen", async () => {
    store(ready());
    open("step=payment");
    const summary = await screen.findByRole("region", { name: "Order summary" });
    await waitFor(() =>
      expect(within(summary).getByText("Balance due").nextElementSibling).toHaveTextContent("₹1,250"),
    );
    expect(within(summary).getByText("Paid now").nextElementSibling).toHaveTextContent("₹0");

    await userEvent.click(screen.getByRole("radio", { name: "Paid in full" }));
    expect(within(summary).getByText("Paid now").nextElementSibling).toHaveTextContent("₹1,250");
    await userEvent.click(screen.getByRole("radio", { name: "Part paid" }));
    expect(within(summary).getByText("Paid now").nextElementSibling).toHaveTextContent("₹0");
    await userEvent.type(screen.getByLabelText(/Amount paid/), "500");
    expect(within(summary).getByText("Balance due").nextElementSibling).toHaveTextContent("₹750");
  });

  it("places the order once however often it is tapped, and starts a fresh one (§133.3 C2)", async () => {
    let finish: (order: Order) => void = () => undefined;
    vi.mocked(OrdersClient.createOrder).mockImplementation(() => new Promise((resolve) => (finish = resolve)));
    store(ready());
    open("step=payment");
    await loaded();

    const [place] = screen.getAllByRole("button", { name: "Place order" });
    await userEvent.click(place);
    await userEvent.click(place);
    expect(OrdersClient.createOrder).toHaveBeenCalledOnce();
    const [payload, key] = vi.mocked(OrdersClient.createOrder).mock.calls[0];
    expect(payload).toMatchObject({ customer: { kind: "GUEST" }, items: [{ productId: CAKE, quantity: 1 }] });
    expect(key).toMatch(/[0-9a-f-]{36}/);

    await act(async () => finish(placed));
    const done = await screen.findByRole("dialog", { name: "Order placed" });
    expect(done).toHaveTextContent("ORD-1001 is saved.");
    expect(done).toHaveTextContent("Guest");
    expect(done).toHaveTextContent("₹1,250");
    expect(within(done).getByRole("link", { name: "View order" })).toHaveAttribute("href", "/orders/o-1");
    expect(nav.router.replace).toHaveBeenCalledWith("/orders/new");
    expect(localStorage.getItem("ovenly_user:u-1:order_draft")).toContain('"lines":[]');
  });

  it("names the customer on the card", async () => {
    vi.mocked(OrdersClient.createOrder).mockResolvedValue(placed);
    store(
      chooseCustomer(withCake(), {
        kind: "CUSTOMER",
        id: meena.id,
        name: "Meena Gupta",
        phone: meena.phone,
        address: "",
        googleMapsLink: "",
      }),
    );
    open("step=payment");
    await loaded();
    await userEvent.click(screen.getAllByRole("button", { name: "Place order" })[0]);
    expect(await screen.findByRole("dialog", { name: "Order placed" })).toHaveTextContent("Meena Gupta");
  });

  it("tries again with the same key after a failure", async () => {
    vi.mocked(OrdersClient.createOrder)
      .mockRejectedValueOnce(new ApiError(500, "INTERNAL_ERROR", "Something went wrong.", "req_9"))
      .mockResolvedValueOnce(placed);
    store(ready());
    open("step=payment");
    await loaded();
    await userEvent.click(screen.getAllByRole("button", { name: "Place order" })[0]);

    expect(await screen.findByRole("alertdialog", { name: "Order not placed" })).toHaveTextContent(
      "Something went wrong.",
    );
    await userEvent.click(within(card()).getByRole("button", { name: "Try again" }));
    await screen.findByRole("dialog", { name: "Order placed" });
    const [first, second] = vi.mocked(OrdersClient.createOrder).mock.calls;
    expect(second[1]).toBe(first[1]);
  });

  it("names what is short when the stock refuses, with nothing to try again", async () => {
    vi.mocked(OrdersClient.createOrder).mockRejectedValue(
      new ApiError(422, "ORDER_INSUFFICIENT_STOCK", "Not enough stock.", "req_2", {
        shortfalls: [
          { productId: CAKE, name: "Chocolate truffle cake", requested: 3, available: 2 },
          { productId: "p-2", name: "Brownie", requested: 1, available: 0 },
        ],
      }),
    );
    store(ready());
    open("step=payment");
    await loaded();
    await userEvent.click(screen.getAllByRole("button", { name: "Place order" })[0]);

    const refused = await screen.findByRole("alertdialog", { name: "Order not placed" });
    expect(refused).toHaveTextContent("Only 2 left of Chocolate truffle cake. Brownie is out of stock.");
    expect(refused).toHaveTextContent("req_2");
    expect(within(refused).queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  });

  it("reports a stock refusal that names nothing, and any other failure, in the API's words or the fallback", async () => {
    vi.mocked(OrdersClient.createOrder)
      .mockRejectedValueOnce(new ApiError(422, "ORDER_INSUFFICIENT_STOCK", "Not enough stock.", "req_3"))
      .mockRejectedValueOnce(new Error("offline"));
    store(ready());
    open("step=payment");
    await loaded();
    await userEvent.click(screen.getAllByRole("button", { name: "Place order" })[0]);
    expect(await screen.findByRole("alertdialog", { name: "Order not placed" })).toHaveTextContent("Not enough stock.");

    await userEvent.click(within(card()).getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(card()).toHaveTextContent("Could not save your changes."));
  });

  it("sends a phone back to the first step with something to put right", async () => {
    store(withCake());
    open("step=payment");
    await loaded();
    await userEvent.click(screen.getAllByRole("button", { name: "Place order" })[0]);
    expect(nav.router.push).toHaveBeenCalledWith("/orders/new?step=details");
    expect(OrdersClient.createOrder).not.toHaveBeenCalled();
  });

  it("stays on the payment step when that is what needs putting right", async () => {
    store(ready(setPayment(withCake(), { status: "PARTIALLY_PAID", amount: "" })));
    open("step=payment");
    await loaded();
    await userEvent.click(screen.getAllByRole("button", { name: "Place order" })[0]);
    expect(nav.router.push).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/Amount paid/)).toHaveAttribute("aria-invalid", "true");
  });

  it("keeps a wide screen where it is, since every step is on it", async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
    store(withCake());
    open();
    await loaded();
    await userEvent.click(screen.getAllByRole("button", { name: "Place order" })[0]);
    expect(nav.router.push).not.toHaveBeenCalled();
    expect(button("Choose a customer")).toHaveAccessibleDescription("Choose a customer.");
  });
});

describe("NewOrder: clearing", () => {
  it("clears the order only once that is confirmed", async () => {
    store(withCake());
    open("step=details");
    await loaded();

    await userEvent.click(screen.getAllByRole("button", { name: "Clear all" })[0]);
    await userEvent.click(within(card()).getByRole("button", { name: "Keep editing" }));
    expect(button("Remove Chocolate truffle cake")).toBeInTheDocument();

    await userEvent.click(screen.getAllByRole("button", { name: "Clear all" })[1]);
    await userEvent.click(within(card()).getByRole("button", { name: "Clear all" }));
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Remove Chocolate truffle cake" })).not.toBeInTheDocument(),
    );
    expect(nav.router.replace).toHaveBeenCalledWith("/orders/new");
    expect(screen.queryByRole("button", { name: "Clear all" })).not.toBeInTheDocument();
  });
});
