import { describe, expect, it } from "vitest";

import { ORDER_STATUSES } from "@/constants/statuses";

import { canMoveTo, isFinal, movesBack, nextStatuses } from "@/features/orders/lifecycle";

describe("nextStatuses", () => {
  it("moves a new order on in one step, as far as it goes, or cancels it (§139.11.8, 2026-09-27)", () => {
    expect(nextStatuses("PENDING", "DELIVERY")).toEqual(["IN_PROGRESS", "READY", "IN_TRANSIT", "DELIVERED", "CANCELLED"]);
    expect(nextStatuses("PENDING", "PICKUP")).toEqual(["IN_PROGRESS", "READY", "DELIVERED", "CANCELLED"]);
  });

  it("offers the usual next step first, then the rest onward, then the way back, Cancel last", () => {
    expect(nextStatuses("IN_PROGRESS", "DELIVERY")).toEqual(["READY", "IN_TRANSIT", "DELIVERED", "PENDING", "CANCELLED"]);
    expect(nextStatuses("IN_PROGRESS", "PICKUP")).toEqual(["READY", "DELIVERED", "PENDING", "CANCELLED"]);
    expect(nextStatuses("READY", "DELIVERY")).toEqual(["IN_TRANSIT", "DELIVERED", "IN_PROGRESS", "PENDING", "CANCELLED"]);
    expect(nextStatuses("READY", "PICKUP")).toEqual(["DELIVERED", "IN_PROGRESS", "PENDING", "CANCELLED"]);
    expect(nextStatuses("IN_TRANSIT", "DELIVERY")).toEqual(["DELIVERED", "READY", "IN_PROGRESS", "PENDING", "CANCELLED"]);
  });

  it("lets nothing follow a delivered or cancelled order", () => {
    expect(nextStatuses("DELIVERED", "DELIVERY")).toEqual([]);
    expect(nextStatuses("CANCELLED", "PICKUP")).toEqual([]);
  });

  it("never offers a status the database does not know, nor the one it is in", () => {
    for (const status of ORDER_STATUSES) {
      for (const next of nextStatuses(status, "DELIVERY")) {
        expect(ORDER_STATUSES).toContain(next);
        expect(next).not.toBe(status);
      }
    }
  });
});

describe("canMoveTo", () => {
  it("refuses the moves that corrupted stock (BUG-05): nothing moves a finished order", () => {
    expect(canMoveTo("DELIVERED", "PENDING", "DELIVERY")).toBe(false);
    expect(canMoveTo("CANCELLED", "DELIVERED", "DELIVERY")).toBe(false);
    expect(canMoveTo("DELIVERED", "CANCELLED", "PICKUP")).toBe(false);
  });

  it("allows the moves in the table: straight to done, or back after a mistake", () => {
    expect(canMoveTo("PENDING", "DELIVERED", "PICKUP")).toBe(true);
    expect(canMoveTo("IN_PROGRESS", "PENDING", "PICKUP")).toBe(true);
    expect(canMoveTo("IN_TRANSIT", "READY", "DELIVERY")).toBe(true);
    expect(canMoveTo("IN_TRANSIT", "CANCELLED", "DELIVERY")).toBe(true);
  });

  it("refuses out for delivery on a pickup", () => {
    expect(canMoveTo("PENDING", "IN_TRANSIT", "PICKUP")).toBe(false);
    expect(canMoveTo("IN_PROGRESS", "IN_TRANSIT", "PICKUP")).toBe(false);
    expect(canMoveTo("READY", "IN_TRANSIT", "PICKUP")).toBe(false);
  });
});

describe("isFinal", () => {
  it("is Delivered and Cancelled only", () => {
    expect(ORDER_STATUSES.filter(isFinal)).toEqual(["DELIVERED", "CANCELLED"]);
  });
});

describe("movesBack", () => {
  it("is a move to an earlier open status", () => {
    expect(movesBack("IN_PROGRESS", "PENDING")).toBe(true);
    expect(movesBack("IN_TRANSIT", "READY")).toBe(true);
    expect(movesBack("PENDING", "READY")).toBe(false);
    expect(movesBack("READY", "READY")).toBe(false);
  });

  it("never counts a final move as going back", () => {
    expect(movesBack("IN_TRANSIT", "DELIVERED")).toBe(false);
    expect(movesBack("READY", "CANCELLED")).toBe(false);
  });
});
