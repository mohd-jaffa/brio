import { describe, expect, it } from "vitest";

import { ORDER_STATUSES } from "@/constants/statuses";

import { canMoveTo, nextStatuses } from "@/features/orders/lifecycle";

describe("nextStatuses", () => {
  it("moves a new order into preparation, or cancels it", () => {
    expect(nextStatuses("PENDING", "DELIVERY")).toEqual(["IN_PROGRESS", "CANCELLED"]);
  });

  it("offers Ready first, and sends only a delivery order out for delivery (§139.11.8)", () => {
    expect(nextStatuses("IN_PROGRESS", "DELIVERY")).toEqual(["READY", "IN_TRANSIT", "DELIVERED", "CANCELLED"]);
    expect(nextStatuses("IN_PROGRESS", "PICKUP")).toEqual(["READY", "DELIVERED", "CANCELLED"]);
    expect(nextStatuses("READY", "DELIVERY")).toEqual(["IN_TRANSIT", "DELIVERED", "CANCELLED"]);
    expect(nextStatuses("READY", "PICKUP")).toEqual(["DELIVERED", "CANCELLED"]);
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
    expect(canMoveTo("READY", "IN_TRANSIT", "PICKUP")).toBe(false);
  });

  it("never goes back to Ready once an order is out", () => {
    expect(canMoveTo("IN_TRANSIT", "READY", "DELIVERY")).toBe(false);
    expect(canMoveTo("PENDING", "READY", "PICKUP")).toBe(false);
  });
});
