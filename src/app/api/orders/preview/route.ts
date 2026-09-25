import { withBakeryRoute } from "@/features/auth/guard";
import { estimateOrder } from "@/features/orders/estimate";
import { readJson } from "@/lib/api/handler";
import { createOrderSchema } from "@/lib/validation";

export const runtime = "nodejs";

// The estimate (plan §139.11.5): the same schema and pricing as creation,
// the stock checked, and nothing written.
export async function POST(request: Request) {
  return withBakeryRoute(request, async (tenant) => estimateOrder(tenant, await readJson(request, createOrderSchema)));
}
