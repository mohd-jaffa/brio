import { type Order, type OrderRow, type OrderItemRow, type OrderAdjustmentRow } from "./types";

export function mapToOrderModel(order: OrderRow, items: OrderItemRow[], adjustments: OrderAdjustmentRow[]): Order {
  return {
    id: order.id,
    customerId: order.customer_id,
    orderNumber: order.order_number,
    status: order.status,
    payment: {
      status: order.payment_status,
      method: order.payment_method ?? undefined,
      reference: order.payment_reference ?? undefined,
    },
    pricing: {
      subtotal: order.subtotal,
      discount: order.discount,
      deliveryCharge: order.delivery_charge,
      tax: order.tax,
      total: order.total,
    },
    delivery: {
      type: order.delivery_type,
      date: order.delivery_date,
      address: order.delivery_address ?? undefined,
      googleMapsLink: order.delivery_google_maps_link ?? undefined,
    },
    notes: order.notes ?? undefined,
    items: items.map(i => ({
      id: i.id,
      productId: i.product_id ?? undefined,
      productName: i.product_name,
      unitPrice: i.unit_price,
      quantity: i.quantity,
      subtotal: i.subtotal,
      notes: i.notes ?? undefined,
    })),
    adjustments: adjustments.map(a => ({
      id: a.id,
      type: a.type,
      name: a.name,
      amount: a.amount,
    })),
    createdAt: order.created_at,
    updatedAt: order.updated_at,
  };
}
