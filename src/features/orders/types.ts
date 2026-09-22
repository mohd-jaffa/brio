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
  customer_id: string;
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
  customerId: string;
  orderNumber: string;
  status: OrderStatus;
  payment: {
    status: PaymentStatus;
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
