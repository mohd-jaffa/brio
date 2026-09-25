import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { Customer } from "@/features/customers/types";
import { OrderContact } from "@/features/orders/components/OrderContact";

import { anOrder } from "@tests/support/orders";

const meena: Customer = {
  id: "c-1",
  name: "Meena Gupta",
  phone: "+919834567890",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

const customerCard = () => screen.getByRole("region", { name: "Customer" });
const handover = () => screen.getByRole("region", { name: "Handover" });

describe("OrderContact", () => {
  it("names the customer with their number, to call or to message on WhatsApp (IMP-02)", () => {
    render(<OrderContact order={anOrder()} customer={meena} loading={false} />);
    expect(customerCard()).toHaveTextContent("Meena Gupta");
    expect(customerCard()).toHaveTextContent("+91 98345 67890");
    expect(screen.getByRole("link", { name: "Call Meena Gupta" })).toHaveAttribute("href", "tel:+919834567890");
    const chat = screen.getByRole("link", { name: "WhatsApp Meena Gupta" });
    expect(chat).toHaveAttribute("href", "https://wa.me/919834567890");
    expect(chat).toHaveAttribute("target", "_blank");
  });

  it("says Guest for a Guest order, with no one to call", () => {
    render(<OrderContact order={anOrder({ customerId: null })} loading={false} />);
    expect(customerCard()).toHaveTextContent("Guest");
    expect(within(customerCard()).queryByRole("link")).not.toBeInTheDocument();
  });

  it("waits for the customer, and says so when they cannot be found", () => {
    const { unmount } = render(<OrderContact order={anOrder()} loading />);
    expect(customerCard()).not.toHaveTextContent("Unknown customer");
    unmount();

    render(<OrderContact order={anOrder()} loading={false} />);
    expect(customerCard()).toHaveTextContent("Unknown customer");
  });

  it("says how and when it is handed over, where to, and opens the map", () => {
    render(<OrderContact order={anOrder()} customer={meena} loading={false} />);
    expect(handover()).toHaveTextContent("Delivery · 27 Sep 2099, 2:00 PM");
    expect(handover()).toHaveTextContent("Block B-404, Green Park");
    const map = within(handover()).getByRole("link", { name: /^Map/ });
    expect(map).toHaveAttribute("href", "https://maps.app.goo.gl/meena");
    expect(map).toHaveAttribute("target", "_blank");
  });

  it("marks a late order, and shows no place or map for a pickup", () => {
    const pickup = anOrder({ delivery: { type: "PICKUP", date: "2020-01-01T10:00:00.000Z" } });
    render(<OrderContact order={pickup} loading={false} />);
    expect(handover()).toHaveTextContent("Pickup · 1 Jan 2020, 3:30 PM · Overdue");
    expect(within(handover()).queryByRole("link")).not.toBeInTheDocument();
  });
});
