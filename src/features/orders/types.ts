import type {
  AdjustmentType,
  DeliveryType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from "@/constants/statuses";

export type { AdjustmentType, DeliveryType, OrderStatus, PaymentMethod, PaymentStatus };

export interface OrderRow {
  id: string;
  bakery_id: string;
  /** NULL is a Guest order (plan §139.11.3). */
  customer_id: string | null;
  order_number: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod | null;
  payment_reference: string | null;
  subtotal: number;
  discount: number;
  delivery_charge: number;
  tax: number;
  total: number;
  delivery_type: DeliveryType;
  delivery_date: string;
  delivery_address: string | null;
  delivery_google_maps_link: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItemRow {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
  notes: string | null;
  created_at: string;
}

export interface OrderAdjustmentRow {
  id: string;
  order_id: string;
  type: AdjustmentType;
  name: string;
  amount: number;
  created_at: string;
}

export interface OrderItem {
  id: string;
  productId?: string;
  /** A special request typed on the order, with no product and no stock (plan §139.11.7). */
  custom: boolean;
  productName: string;
  unitPrice: number; // paise
  quantity: number;
  subtotal: number; // paise
  notes?: string;
}

export interface OrderAdjustment {
  id: string;
  type: AdjustmentType;
  name: string;
  amount: number; // paise
}

export interface Order {
  id: string;
  /** null for a Guest order (plan §139.11.3). */
  customerId: string | null;
  orderNumber: string;
  status: OrderStatus;
  payment: {
    status: PaymentStatus;
    /** What the payments recorded against this order add up to, in whole paise. */
    paid: number;
    method?: PaymentMethod;
    reference?: string;
  };
  pricing: {
    subtotal: number;
    discount: number;
    deliveryCharge: number;
    tax: number;
    total: number;
  };
  delivery: {
    type: DeliveryType;
    date: string;
    address?: string;
    googleMapsLink?: string;
  };
  notes?: string;
  items: OrderItem[];
  adjustments: OrderAdjustment[];
  createdAt: string;
  updatedAt: string;
}

/**
 * An order as a list shows it (plan §139.10): the row on a phone, the line of
 * a desktop table, the due list on Home. Enough to draw it and no more — the
 * whole order is read when it is opened.
 */
export interface OrderListItem {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  deliveryType: DeliveryType;
  /** When it is due: the delivery, or the pickup. */
  dueAt: string;
  /** null is a Guest order (plan §139.11.3). */
  customer: { id: string; name: string } | null;
  /** The first line, for the row's picture and words; null only for an order with none. */
  firstItem: { name: string; iconKey: string | null; custom: boolean } | null;
  /** How many lines the order has in all: the row says "+2 more" for the rest. */
  lineCount: number;
  /** Whole paise. */
  total: number;
  paymentStatus: PaymentStatus;
  /** Whole paise still owed; none on a cancelled order (IMP-07). */
  balanceDue: number;
  createdAt: string;
}
