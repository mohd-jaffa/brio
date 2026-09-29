import type { Tenant } from "@/lib/supabase/tenant";

import type { DeliveryType, PaymentMethod, PaymentStatus } from "@/constants/statuses";
import { fromPostgrestError } from "@/lib/errors/fromSupabaseError";
import type { CreateOrderPayload } from "@/lib/validation";

import { priceDraft, type PricedCustomer, type PricedLine } from "./pricing";
import type { OrderTotals } from "./totals";

/** A stocked product the draft asks for more of than there is (0015's `stock_shortfalls`). */
export interface StockShortfall {
  productId: string;
  name: string;
  available: number;
  requested: number;
}

/**
 * The bill before the order exists (plan §139.11.5): no number, dated now,
 * payment as chosen so far. Every figure is the server's, from the same
 * pricing Place order uses, so what the estimate says is what is created.
 */
export interface OrderEstimate {
  customer: PricedCustomer;
  lines: PricedLine[];
  adjustments: { type: "DISCOUNT" | "CHARGE"; name: string; amount: number }[];
  totals: OrderTotals;
  delivery: { type: DeliveryType; date: string; address: string | null; googleMapsLink: string | null };
  payment: { status: PaymentStatus; paid: number; method: PaymentMethod | null; reference: string | null };
  balanceDue: number;
  /** Empty when there is stock for everything; Place order would refuse otherwise. */
  shortfalls: StockShortfall[];
  issuedAt: string;
}

/** Prices a draft and checks its stock. Writes nothing (§15, §132). */
export async function estimateOrder(tenant: Tenant, input: CreateOrderPayload): Promise<OrderEstimate> {
  const { customer, lines, totals, payment } = await priceDraft(tenant, input);
  const shortfalls = await findStockShortfalls(tenant, lines);
  const paid = payment.status === "UNPAID" ? 0 : payment.amount;

  return {
    customer,
    lines,
    adjustments: input.adjustments.map(({ type, name, amount }) => ({ type, name, amount })),
    totals,
    delivery: {
      type: input.delivery.type,
      date: input.delivery.date,
      address: input.delivery.address,
      googleMapsLink: input.delivery.googleMapsLink,
    },
    payment: {
      status: payment.status,
      paid,
      method: payment.status === "UNPAID" ? null : payment.method,
      reference: payment.status === "UNPAID" ? null : payment.reference,
    },
    balanceDue: Math.max(0, totals.total - paid),
    shortfalls,
    issuedAt: new Date().toISOString(),
  };
}

/** The same check `create_order` makes, without its locks — an estimate reserves nothing. */
async function findStockShortfalls(tenant: Tenant, lines: readonly PricedLine[]): Promise<StockShortfall[]> {
  const stocked = lines.filter((line) => line.productId !== null);
  if (stocked.length === 0) return [];

  const { data, error } = await tenant.supabase.rpc("stock_shortfalls", {
    p_lines: stocked.map((line) => ({ product_id: line.productId, quantity: line.quantity })),
  });
  if (error) throw fromPostgrestError(error);

  return ((data ?? []) as { product_id: string; product_name: string; available: number; requested: number }[]).map(
    (row) => ({
      productId: row.product_id,
      name: row.product_name,
      available: row.available,
      requested: row.requested,
    }),
  );
}
