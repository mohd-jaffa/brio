import type { Tenant } from "@/lib/supabase/tenant";

import { MAX_ORDER_TOTAL_PAISE } from "@/constants/limits";
import { getCustomerById } from "@/features/customers/api";
import { getProductsByIds } from "@/features/products/api";
import { businessRuleError, conflictError } from "@/lib/errors";
import type { CreateOrderPayload } from "@/lib/validation";

import { orderTotals, type OrderTotals } from "./totals";

/**
 * What an order draft comes to, worked out on the server (AGENTS.md §13). Both
 * placing an order and its estimate (`POST /api/orders/preview`, §139.11.5)
 * price a draft here, so the estimate is exactly what Place order creates.
 *
 * Nothing the browser sent about money is trusted: a catalogue line takes its
 * name and price from the product as it is now; only a custom line's price is
 * typed, because that is what a custom line is (§139.11.7).
 */
export interface PricedLine {
  /** null for a custom line, which moves no stock. */
  productId: string | null;
  name: string;
  /** Whole paise. */
  unitPrice: number;
  quantity: number;
  subtotal: number;
  /** Printed under the line on the bill (§139.11.6). */
  notes: string | null;
}

export type PricedCustomer = { kind: "GUEST" } | { kind: "CUSTOMER"; id: string; name: string; phone: string };

export interface PricedDraft {
  customer: PricedCustomer;
  lines: PricedLine[];
  totals: OrderTotals;
}

export async function priceDraft(tenant: Tenant, input: CreateOrderPayload): Promise<PricedDraft> {
  // A saved customer is read back through this business's records, so one
  // that belongs to another business is refused as not found — never stored
  // (BUG-19). A Guest has nothing to read.
  const customer: PricedCustomer =
    input.customer.kind === "GUEST"
      ? { kind: "GUEST" }
      : await getCustomerById(tenant, input.customer.id).then(({ id, name, phone }) => ({
          kind: "CUSTOMER" as const,
          id,
          name,
          phone,
        }));

  const productIds = input.items.flatMap((item) => ("productId" in item ? [item.productId] : []));
  const products = new Map((await getProductsByIds(tenant, productIds)).map((product) => [product.id, product]));

  const lines = input.items.map((item): PricedLine => {
    if ("custom" in item) {
      const { name, unitPrice } = item.custom;
      return { productId: null, name, unitPrice, quantity: item.quantity, subtotal: unitPrice * item.quantity, notes: item.notes };
    }
    const product = products.get(item.productId);
    // Gone, another business's, or taken off the menu: all read the same.
    if (!product?.isActive) throw conflictError("ORDER_PRODUCT_UNAVAILABLE", { productId: item.productId });
    return {
      productId: product.id,
      name: product.name,
      unitPrice: product.defaultPrice,
      quantity: item.quantity,
      subtotal: product.defaultPrice * item.quantity,
      notes: item.notes,
    };
  });

  // The same formula the order screen shows its running total with (./totals).
  const totals = orderTotals(lines, input.adjustments);

  if (totals.total < 0) throw businessRuleError("ORDER_TOTAL_NEGATIVE", { total: totals.total });
  // Each field is bounded, but enough lines of them are not; the stored totals
  // must fit their integer columns (BUG-12).
  if (totals.subtotal > MAX_ORDER_TOTAL_PAISE || totals.total > MAX_ORDER_TOTAL_PAISE) {
    throw businessRuleError("ORDER_TOTAL_TOO_LARGE", { subtotal: totals.subtotal, total: totals.total });
  }

  return { customer, lines, totals };
}
