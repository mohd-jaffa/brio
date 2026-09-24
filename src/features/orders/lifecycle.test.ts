import { describe, expect, it } from "vitest";

import { ORDER_STATUSES } from "@/constants/statuses";
import { sumPaise } from "@/lib/money";

import { canMoveTo, nextStatuses, stockMovements } from "./lifecycle";

describe("nextStatuses", () => {
  it("moves a new order into preparation, or cancels it", () => {
    expect(nextStatuses("PENDING", "DELIVERY")).toEqual(["IN_PROGRESS", "CANCELLED"]);
  });

  it("sends only a delivery order out for delivery", () => {
    expect(nextStatuses("IN_PROGRESS", "DELIVERY")).toEqual(["IN_TRANSIT", "DELIVERED", "CANCELLED"]);
    expect(nextStatuses("IN_PROGRESS", "PICKUP")).toEqual(["DELIVERED", "CANCELLED"]);
  });

  it("lets nothing follow a delivered or cancelled order", () => {
    expect(nextStatuses("DELIVERED", "DELIVERY")).toEqual([]);
    expect(nextStatuses("CANCELLED", "PICKUP")).toEqual([]);
  });

  it("never offers a status the database does not know", () => {
    for (const status of ORDER_STATUSES) {
      for (const next of nextStatuses(status, "DELIVERY")) expect(ORDER_STATUSES).toContain(next);
    }
  });
});

describe("canMoveTo", () => {
  it("refuses the moves that corrupted stock (BUG-05)", () => {
    expect(canMoveTo("DELIVERED", "PENDING", "DELIVERY")).toBe(false);
    expect(canMoveTo("CANCELLED", "DELIVERED", "DELIVERY")).toBe(false);
    expect(canMoveTo("PENDING", "DELIVERED", "PICKUP")).toBe(false);
  });

  it("allows the moves in the table", () => {
    expect(canMoveTo("PENDING", "IN_PROGRESS", "PICKUP")).toBe(true);
    expect(canMoveTo("IN_TRANSIT", "DELIVERED", "DELIVERY")).toBe(true);
    expect(canMoveTo("IN_TRANSIT", "CANCELLED", "DELIVERY")).toBe(true);
  });

  it("refuses out for delivery on a pickup", () => {
    expect(canMoveTo("IN_PROGRESS", "IN_TRANSIT", "PICKUP")).toBe(false);
  });
});

describe("stockMovements", () => {
  const lines = [
    { product_id: "cake", quantity: 2 },
    { product_id: "bread", quantity: 1 },
  ];
  const reserved = lines.map((line) => -line.quantity);

  it("releases the reservation when an order is cancelled (BUG-04)", () => {
    const moves = stockMovements("CANCELLED", lines);
    expect(moves).toEqual([
      { productId: "cake", type: "ORDER_RESERVATION", quantity: 2 },
      { productId: "bread", type: "ORDER_RESERVATION", quantity: 1 },
    ]);
    // Placed then cancelled: stock is where it started.
    expect(sumPaise([...reserved, ...moves.map((move) => move.quantity)])).toBe(0);
  });

  it("turns the reservation into consumption on delivery, without taking stock twice (§133.3 C5)", () => {
    const moves = stockMovements("DELIVERED", lines);
    expect(moves).toEqual([
      { productId: "cake", type: "ORDER_RESERVATION", quantity: 2 },
      { productId: "cake", type: "ORDER_CONSUMPTION", quantity: -2 },
      { productId: "bread", type: "ORDER_RESERVATION", quantity: 1 },
      { productId: "bread", type: "ORDER_CONSUMPTION", quantity: -1 },
    ]);
    // Placed then delivered: stock is down by exactly what was sold.
    expect(sumPaise([...reserved, ...moves.map((move) => move.quantity)])).toBe(-3);
  });

  it("moves no stock on the way there", () => {
    expect(stockMovements("IN_PROGRESS", lines)).toEqual([]);
    expect(stockMovements("IN_TRANSIT", lines)).toEqual([]);
  });

  it("leaves a line with no product alone — it never reserved anything", () => {
    expect(stockMovements("CANCELLED", [{ product_id: null, quantity: 3 }])).toEqual([]);
  });
});
