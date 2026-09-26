import type { Order, OrderListItem } from "@/features/orders/types";
import type { Payment } from "@/features/payments/types";

/**
 * An order as the API answers it, for a component test: ORD-1006, a delivery
 * for a saved customer, two lines (one custom, with its note) and ₹50 off,
 * part paid ₹500 of ₹1,250. Pass what the test is about.
 */
export function anOrder(changes: Partial<Order> = {}): Order {
  return {
    id: "o-1",
    customerId: "c-1",
    orderNumber: "ORD-1006",
    status: "PENDING",
    payment: { status: "PARTIALLY_PAID", paid: 50000 },
    pricing: { subtotal: 130000, discount: 5000, deliveryCharge: 0, tax: 0, total: 125000 },
    delivery: {
      type: "DELIVERY",
      date: "2099-09-27T08:30:00.000Z",
      address: "Block B-404, Green Park",
      googleMapsLink: "https://maps.app.goo.gl/meena",
    },
    items: [
      {
        id: "i-1",
        productId: "p-1",
        custom: false,
        productName: "Red Velvet Cupcakes (Box of 6)",
        unitPrice: 57500,
        quantity: 2,
        subtotal: 115000,
      },
      {
        id: "i-2",
        custom: true,
        productName: "Name topper",
        unitPrice: 15000,
        quantity: 1,
        subtotal: 15000,
        notes: "Gold, ‘Anu’",
      },
    ],
    adjustments: [{ id: "a-1", type: "DISCOUNT", name: "Festive", amount: 5000 }],
    createdAt: "2026-09-26T00:00:00.000Z",
    updatedAt: "2026-09-26T00:00:00.000Z",
    ...changes,
  };
}

export function aPayment(changes: Partial<Payment> = {}): Payment {
  return {
    id: "pay-1",
    bakery_id: "b-1",
    order_id: "o-1",
    amount: 50000,
    payment_method: "CASH",
    reference: null,
    idempotency_key: null,
    paid_at: "2026-09-26T07:06:00.000Z",
    created_at: "2026-09-26T07:06:00.000Z",
    ...changes,
  };
}

/** An order as a list shows it (`OrderListItem`): ORD-1006 for Meena, a cake, part paid. */
export function anOrderListItem(changes: Partial<OrderListItem> = {}): OrderListItem {
  return {
    id: "o-1",
    orderNumber: "ORD-1006",
    status: "PENDING",
    deliveryType: "DELIVERY",
    dueAt: "2026-09-27T05:00:00Z",
    customer: { id: "c-1", name: "Meena Gupta" },
    firstItem: { name: "Chocolate truffle cake", iconKey: "chocolate-cake-slice", custom: false },
    lineCount: 1,
    total: 125000,
    paymentStatus: "PARTIALLY_PAID",
    balanceDue: 75000,
    createdAt: "2026-09-26T05:00:00Z",
    ...changes,
  };
}
