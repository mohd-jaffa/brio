import { type Order, type OrderItem } from "../orders/types";
import { type Payment } from "../payments/types";

export interface ReceiptData {
  order: Order;
  items: OrderItem[];
  payments: Payment[];
  bakeryName: string; // From context or bakery profile
  generatedAt: string;
}
