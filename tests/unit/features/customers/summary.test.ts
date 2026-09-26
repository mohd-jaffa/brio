import { describe, expect, it } from "vitest";

import { customerSegment, deliveryAddresses, newCustomersSince, summarise, type SummaryOrder } from "@/features/customers/summary";

const now = new Date("2026-09-26T06:00:00Z"); // 11:30 in India

const order = (changes: Partial<SummaryOrder> = {}): SummaryOrder => ({
  total: 100000,
  status: "DELIVERED",
  created_at: "2026-09-20T05:00:00Z",
  delivery_type: "DELIVERY",
  delivery_address: "12 MG Road",
  delivery_google_maps_link: null,
  payments: [],
  ...changes,
});

describe("customerSegment", () => {
  it("is Regular from three orders, New while added in the last 30 days, and neither otherwise", () => {
    expect(customerSegment(3, "2026-09-25T00:00:00Z", now)).toBe("REGULAR");
    expect(customerSegment(2, "2026-09-25T00:00:00Z", now)).toBe("NEW");
    expect(customerSegment(0, "2026-08-27T18:30:00Z", now)).toBe("NEW");
    expect(customerSegment(0, "2026-08-27T18:29:59Z", now)).toBeNull();
  });

  it("counts New from the start of the 30th day back, in the business's calendar", () => {
    expect(newCustomersSince(now)).toBe("2026-08-27T18:30:00.000Z");
  });
});

describe("deliveryAddresses", () => {
  it("lists each place a delivery went once, however it was spaced, most recently used first", () => {
    expect(
      deliveryAddresses([
        order({ delivery_address: "12 MG Road", created_at: "2026-09-01T00:00:00Z" }),
        order({ delivery_address: " 12  mg road ", created_at: "2026-09-10T00:00:00Z" }),
        order({ delivery_address: "4 Park St", delivery_google_maps_link: "https://maps.app/x", created_at: "2026-09-05T00:00:00Z" }),
        order({ delivery_address: null, delivery_google_maps_link: "https://maps.app/y", created_at: "2026-09-03T00:00:00Z" }),
      ]),
    ).toEqual([
      { address: "12  mg road", googleMapsLink: undefined, lastUsed: "2026-09-10T00:00:00Z" },
      { address: "4 Park St", googleMapsLink: "https://maps.app/x", lastUsed: "2026-09-05T00:00:00Z" },
      { address: "", googleMapsLink: "https://maps.app/y", lastUsed: "2026-09-03T00:00:00Z" },
    ]);
  });

  it("keeps the latest use of a place seen again earlier, and leaves out pickups and blank places", () => {
    expect(
      deliveryAddresses([
        order({ created_at: "2026-09-10T00:00:00Z" }),
        order({ created_at: "2026-09-01T00:00:00Z" }),
        order({ delivery_type: "PICKUP", delivery_address: "Shop" }),
        order({ delivery_address: "  ", delivery_google_maps_link: null }),
      ]),
    ).toEqual([{ address: "12 MG Road", googleMapsLink: undefined, lastUsed: "2026-09-10T00:00:00Z" }]);
  });
});

describe("summarise", () => {
  it("adds up orders and spend, what is still owed, and the last order — cancelled ones count for nothing", () => {
    const summary = summarise(
      [
        order({ total: 100000, payments: [{ amount: 100000 }], created_at: "2026-09-01T00:00:00Z" }),
        order({ total: 50000, payments: [{ amount: 20000 }], created_at: "2026-09-12T00:00:00Z" }),
        order({ total: 30000, payments: [{ amount: 90000 }], created_at: "2026-09-05T00:00:00Z" }),
        order({ total: 70000, status: "CANCELLED", created_at: "2026-09-20T00:00:00Z" }),
      ],
      "2026-01-01T00:00:00Z",
      now,
    );
    expect(summary).toMatchObject({
      orders: 3,
      spent: 180000,
      balanceDue: 30000,
      lastOrderAt: "2026-09-12T00:00:00Z",
      segment: "REGULAR",
    });
  });

  it("reads a customer with no orders", () => {
    expect(summarise([], "2026-01-01T00:00:00Z", now)).toEqual({
      orders: 0,
      spent: 0,
      balanceDue: 0,
      lastOrderAt: null,
      segment: null,
      addresses: [],
    });
  });
});
