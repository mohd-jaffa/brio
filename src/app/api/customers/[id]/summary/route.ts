import { withBakeryRoute } from "@/features/auth/guard";
import { getCustomerSummary } from "@/features/customers/api";
import type { RouteParams } from "@/lib/api/params";

export const runtime = "nodejs";

/** A customer's orders, spend, balance due and delivery addresses (plan §139.10). */
export async function GET(request: Request, { params }: RouteParams<"id">) {
  return withBakeryRoute(request, async (tenant) => getCustomerSummary(tenant, (await params).id));
}
