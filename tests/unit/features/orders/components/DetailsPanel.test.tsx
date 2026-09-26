import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { DetailsPanel } from "@/features/orders/components/DetailsPanel";
import {
  addAdjustment,
  addCustom,
  addProduct,
  chooseCustomer,
  newDraft,
  setDelivery,
  setDeliveryType,
  type DraftCustomer,
  type OrderDraft,
} from "@/features/orders/draft";
import type { Product } from "@/features/products/types";

const cake: Product = {
  id: "p-cake",
  name: "Chocolate truffle cake",
  defaultPrice: 125000,
  unit: "piece",
  iconKey: "donut",
  isActive: true,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};
const products = new Map([[cake.id, cake]]);

const anu: DraftCustomer = {
  kind: "CUSTOMER",
  id: "c-anu",
  name: "Anu",
  phone: "+919812345678",
  address: "Flat 302",
  googleMapsLink: "",
};

/** Every draft the screen has held, the last one being what it holds now. */
const seen = vi.fn<(draft: OrderDraft) => void>();
function latest(): OrderDraft {
  const call = seen.mock.lastCall;
  if (!call) throw new Error("The screen has not drawn yet.");
  return call[0];
}

function Screen({
  start,
  errors = {},
  onAddMore,
  onChooseCustomer = vi.fn(),
  onNewCustomer = vi.fn(),
}: {
  start: OrderDraft;
  errors?: Record<string, string>;
  onAddMore?: () => void;
  onChooseCustomer?: () => void;
  onNewCustomer?: () => void;
}) {
  const [draft, setDraft] = useState(start);
  useEffect(() => seen(draft), [draft]);
  return (
    <DetailsPanel
      draft={draft}
      products={products}
      errors={errors}
      update={(change) => setDraft((current) => change(current))}
      onChooseCustomer={onChooseCustomer}
      onNewCustomer={onNewCustomer}
      onAddMore={onAddMore}
    />
  );
}

const withItems = () => addCustom(addProduct(newDraft(), "p-cake"), { name: "Name topper", unitPrice: 15000 });
const items = () =>
  within(screen.getByRole("heading", { name: "Order items" }).closest("section")!).getAllByRole("listitem");

describe("DetailsPanel: the customer", () => {
  it("asks for a customer, and says what is wrong when none is chosen", async () => {
    const onChooseCustomer = vi.fn();
    const onNewCustomer = vi.fn();
    render(
      <Screen
        start={newDraft()}
        errors={{ customer: "Choose a customer." }}
        onChooseCustomer={onChooseCustomer}
        onNewCustomer={onNewCustomer}
      />,
    );
    const card = screen.getByRole("button", { name: "Choose a customer" });
    expect(card).toHaveAccessibleDescription("Choose a customer.");
    await userEvent.click(card);
    expect(onChooseCustomer).toHaveBeenCalledOnce();
    await userEvent.click(screen.getByRole("button", { name: "New customer" }));
    expect(onNewCustomer).toHaveBeenCalledOnce();
  });

  it("names the chosen customer with their number, or a Guest", () => {
    const { unmount } = render(<Screen start={chooseCustomer(newDraft(), anu)} />);
    const card = screen.getByRole("button", { name: "Customer: Anu. Change" });
    expect(card).toHaveTextContent("+91 98123 45678");
    expect(card).not.toHaveAttribute("aria-describedby");
    unmount();

    render(<Screen start={chooseCustomer(newDraft(), { kind: "GUEST" })} />);
    expect(screen.getByRole("button", { name: "Customer: Guest. Change" })).toBeInTheDocument();
  });
});

describe("DetailsPanel: the items", () => {
  it("shows each line with its price and line total, a custom one marked as such", () => {
    render(<Screen start={withItems()} />);
    const [cakeLine, topper] = items();
    expect(within(cakeLine).getByText("Chocolate truffle cake")).toBeInTheDocument();
    expect(within(cakeLine).getAllByText("₹1,250")).toHaveLength(2);
    expect(within(topper).getByText("Custom")).toBeInTheDocument();
    expect(within(topper).getAllByText("₹150")).toHaveLength(2);
  });

  it("changes a quantity and a note, and removes a line", async () => {
    render(<Screen start={withItems()} />);
    await userEvent.click(within(items()[0]).getByRole("button", { name: "Increase" }));
    expect(latest().lines[0].quantity).toBe(2);
    expect(within(items()[0]).getByText("₹2,500")).toBeInTheDocument();

    await userEvent.type(within(items()[0]).getByLabelText(/Note on the bill/), "Happy birthday");
    expect(latest().lines[0].notes).toBe("Happy birthday");

    await userEvent.click(screen.getByRole("button", { name: "Remove Name topper" }));
    expect(latest().lines).toHaveLength(1);
  });

  it("names a product no longer on the list, without a price, and shows the line's issue", () => {
    render(<Screen start={addProduct(newDraft(), "p-gone")} errors={{ "items.0.productId": "Choose a product." }} />);
    expect(within(items()[0]).getByText("No longer available")).toBeInTheDocument();
    expect(within(items()[0]).queryByText(/₹/)).not.toBeInTheDocument();
    expect(screen.getByText("Choose a product.")).toBeInTheDocument();
  });

  it("lands a line added on the grid beside it, on a wide screen, and leaves the ones already there still", () => {
    const panel = (draft: OrderDraft) => (
      <DetailsPanel
        draft={draft}
        products={products}
        errors={{}}
        update={vi.fn()}
        onChooseCustomer={vi.fn()}
        onNewCustomer={vi.fn()}
      />
    );
    const start = addProduct(newDraft(), "p-cake");
    const { rerender } = render(panel(start));
    rerender(panel(addCustom(start, { name: "Name topper", unitPrice: 15000 })));
    const [kept, added] = items();
    expect(kept).not.toHaveClass("lg:animate-drop-in");
    expect(added).toHaveClass("lg:animate-drop-in");
  });

  it("offers a way back to the grid only where the grid is not beside it", async () => {
    const onAddMore = vi.fn();
    const { unmount } = render(<Screen start={withItems()} onAddMore={onAddMore} />);
    await userEvent.click(screen.getByRole("button", { name: "Add more items" }));
    expect(onAddMore).toHaveBeenCalledOnce();
    unmount();

    render(<Screen start={withItems()} errors={{ items: "Add at least one item." }} />);
    expect(screen.queryByRole("button", { name: "Add more items" })).not.toBeInTheDocument();
    expect(screen.getByText("Add at least one item.")).toBeInTheDocument();
  });
});

describe("DetailsPanel: the delivery", () => {
  it("asks for a place only for a delivery, filled from the customer", async () => {
    render(<Screen start={chooseCustomer(newDraft(), anu)} />);
    expect(screen.getByRole("radio", { name: "Pickup" })).toHaveAttribute("aria-checked", "true");
    expect(screen.queryByLabelText(/Delivery address/)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("radio", { name: "Delivery" }));
    expect(screen.getByLabelText(/Delivery address/)).toHaveValue("Flat 302");

    fireEvent.change(screen.getByLabelText(/Date and time/), { target: { value: "2099-12-31T18:30" } });
    expect(latest().delivery.date).toBe("2099-12-31T18:30");
    await userEvent.type(screen.getByLabelText(/Map link/), "https://maps.app.goo.gl/x");
    expect(latest().delivery.googleMapsLink).toBe("https://maps.app.goo.gl/x");
  });

  it("offers the customer's address back once something else was typed", async () => {
    const typed = setDelivery(chooseCustomer(setDeliveryType(newDraft(), "DELIVERY"), anu), { address: "" });
    render(<Screen start={typed} errors={{ "delivery.address": "Add where it goes." }} />);
    await userEvent.type(screen.getByLabelText(/Delivery address/), "Office");
    expect(screen.getByText("Add where it goes.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Use Anu’s address" }));
    expect(latest().delivery.address).toBe("Flat 302");
    expect(screen.queryByRole("button", { name: "Use Anu’s address" })).not.toBeInTheDocument();
  });

  it("settles the delivery fields in when Delivery is chosen, and leaves the lines already there still", async () => {
    const { unmount } = render(<Screen start={setDeliveryType(withItems(), "DELIVERY")} />);
    expect(screen.getByLabelText(/Delivery address/).closest(".animate-drop-in")).toBeNull();
    unmount();

    render(<Screen start={withItems()} />);
    await userEvent.click(screen.getByRole("radio", { name: "Delivery" }));
    expect(screen.getByLabelText(/Delivery address/).closest(".animate-drop-in")).not.toBeNull();
    expect(items()[0]).not.toHaveClass("lg:animate-drop-in");
  });
});

describe("DetailsPanel: discounts, charges and notes", () => {
  it("adds a discount and a charge, each changed and removed", async () => {
    render(<Screen start={newDraft()} errors={{ "adjustments.0.amount": "Enter an amount." }} />);
    await userEvent.click(screen.getByRole("button", { name: "Add discount" }));
    await userEvent.click(screen.getByRole("button", { name: "Add charge" }));
    expect(latest().adjustments.map((entry) => [entry.type, entry.name])).toEqual([
      ["DISCOUNT", "Discount"],
      ["CHARGE", "Delivery"],
    ]);
    expect(screen.getByText("Enter an amount.")).toBeInTheDocument();

    const [first] = screen.getAllByLabelText("Kind");
    await userEvent.selectOptions(first, "CHARGE");
    const [name] = screen.getAllByLabelText("Name");
    await userEvent.clear(name);
    await userEvent.type(name, "Packing");
    expect(screen.getAllByLabelText("Amount (₹)")[0]).toHaveAttribute("inputmode", "decimal");
    await userEvent.type(screen.getAllByLabelText("Amount (₹)")[0], "40");
    expect(latest().adjustments[0]).toMatchObject({ type: "CHARGE", name: "Packing", amount: "40" });

    await userEvent.click(screen.getByRole("button", { name: "Remove Packing" }));
    expect(latest().adjustments).toHaveLength(1);
  });

  it("names a nameless line's remove button, and keeps the internal notes", async () => {
    const draft = addAdjustment(newDraft(), "DISCOUNT", "");
    render(<Screen start={draft} errors={{ notes: "Too long." }} />);
    expect(screen.getByRole("button", { name: "Remove this line" })).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/Internal notes/), "Ring twice");
    expect(latest().notes).toBe("Ring twice");
    expect(screen.getByText("Too long.")).toBeInTheDocument();
  });

  it("drops a discount added here into place, but not one the draft already had", async () => {
    render(<Screen start={addAdjustment(newDraft(), "DISCOUNT", "Festive")} />);
    await userEvent.click(screen.getByRole("button", { name: "Add charge" }));
    const [kept, added] = screen.getAllByLabelText("Kind").map((select) => select.closest("li"));
    expect(kept).not.toHaveClass("animate-drop-in");
    expect(added).toHaveClass("animate-drop-in");
  });
});
