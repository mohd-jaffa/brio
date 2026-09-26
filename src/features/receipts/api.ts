import sharp from "sharp";

import type { Tenant } from "@/lib/supabase/tenant";

import { getBusiness, readLogo } from "@/features/business/api";
import { getCustomerById } from "@/features/customers/api";
import { getOrderById } from "@/features/orders/queries";
import { findPaymentsByOrderId } from "@/features/payments/api";
import { getServerEnv } from "@/lib/env/server";
import { logger } from "@/lib/logger";
import type { Theme } from "@/lib/theme/themes";

import { billFileName, orderBill } from "./bill";
import { billPdf } from "./pdf";
import type { Bill } from "./types";

/**
 * A placed order's bill, built when it is asked for and stored nowhere
 * (AGENTS.md §15): the order with its payments, its customer — none for a
 * Guest — and the business it is from (§133.2 B4). Every read goes through the
 * caller's client, so RLS keeps it to their own business.
 */
export async function getBill(tenant: Tenant, orderId: string): Promise<Bill> {
  const order = await getOrderById(tenant, orderId);
  const [payments, customer, business] = await Promise.all([
    findPaymentsByOrderId(tenant, orderId),
    order.customerId ? getCustomerById(tenant, order.customerId) : undefined,
    getBusiness(tenant),
  ]);
  return orderBill({ order, payments, customer, business, appUrl: getServerEnv().NEXT_PUBLIC_APP_URL });
}

/**
 * The logo as a PDF can hold it: PNG or JPEG as stored, WebP turned into a
 * PNG. A logo that cannot be read leaves the cake mark in its place rather
 * than no bill at all.
 */
async function logoForPdf(tenant: Tenant): Promise<Buffer | null> {
  try {
    const { file, type } = await readLogo(tenant);
    const bytes = Buffer.from(await file.arrayBuffer());
    return type === "image/webp" ? await sharp(bytes).png().toBuffer() : bytes;
  } catch (failure) {
    logger.warn("Bill logo not read; the cake mark is drawn instead", {
      bakeryId: tenant.bakeryId,
      reason: failure instanceof Error ? failure.name : "unknown",
    });
    return null;
  }
}

/**
 * The bill's PDF as a download (`GET /api/orders/{id}/bill.pdf`), named
 * `{order number} - {business name}.pdf` (the user, 2026-09-26), made for this
 * request and kept by nothing — not the server, and not a cache.
 */
export async function getBillPdf(tenant: Tenant, orderId: string, theme: Theme): Promise<Response> {
  const bill = await getBill(tenant, orderId);
  const logo = bill.business.logoUrl ? await logoForPdf(tenant) : null;
  const file = await billPdf(bill, { theme, logo });
  const name = billFileName(bill, "pdf");
  // A plain-ASCII name for old clients, and the name itself for the rest.
  const plain = name.replace(/[^\x20-\x7e]/g, "_");
  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${plain}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
