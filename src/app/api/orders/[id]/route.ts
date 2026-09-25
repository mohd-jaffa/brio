import { getOrderById } from "@/features/orders/queries";
import { updateOrderStatus } from "@/features/orders/status";
import { withBakeryRoute } from "@/features/auth/guard";
import { readJson } from "@/lib/api/handler";
import type { RouteParams } from "@/lib/api/params";
import { updateOrderStatusSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: RouteParams<"id">) {
  return withBakeryRoute(request, async (tenant) =>
    getOrderById(tenant, (await params).id),
  );
}

export async function PATCH(request: Request, { params }: RouteParams<"id">) {
  return withBakeryRoute(request, async (tenant) =>
    updateOrderStatus(tenant, (await params).id, await readJson(request, updateOrderStatusSchema)),
  );
}
