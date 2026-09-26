import type { CustomerSegment } from "@/constants/statuses";
import type { OrderListItem } from "@/features/orders/types";
import type { Period } from "@/lib/dates/range";

export interface CustomerRow {
  id: string;
  bakery_id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  google_maps_link: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  googleMapsLink?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Guest sales for a period (plan §139.11.3, R5.5): how many orders Guests
 * placed and what they came to — cancelled ones not counted — and those
 * orders, newest first, a page at a time.
 */
export interface GuestSales {
  period: Period;
  orders: number;
  sales: number;
  items: OrderListItem[];
  nextCursor: string | null;
}

/**
 * A customer as Customers and the order screen's picker list them (plan
 * §139.10): who they are, with how many orders they have placed — cancelled
 * ones not counted — when they last ordered, and their segment.
 */
export interface CustomerListItem extends Customer {
  orders: number;
  lastOrderAt: string | null;
  segment: CustomerSegment | null;
}

/** Regular, New, or neither (plan §139.10). */
export type { CustomerSegment } from "@/constants/statuses";

/** A delivery address this customer's orders were sent to, and when it was last used. */
export interface CustomerAddress {
  address: string;
  googleMapsLink?: string;
  lastUsed: string;
}

/**
 * What a customer has meant to the business (`GET /api/customers/{id}/summary`,
 * plan §139.10): their orders and spend, cancelled orders not counted; what
 * they still owe; and the distinct places their orders were delivered to,
 * most recent first — read from the orders, so no table of addresses is kept.
 */
export interface CustomerSummary {
  orders: number;
  spent: number;
  balanceDue: number;
  lastOrderAt: string | null;
  segment: CustomerSegment | null;
  addresses: CustomerAddress[];
}
