import { withBakeryRoute } from "@/features/auth/guard";
import { countOrders } from "@/features/orders/list";
import { readQuery } from "@/lib/api/handler";
import { orderCountsQuerySchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withBakeryRoute(request, (tenant) => countOrders(tenant, readQuery(request, orderCountsQuerySchema)));
}
