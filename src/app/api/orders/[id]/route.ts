import { updateOrder } from "@/features/orders/edit";
import { getOrderById } from "@/features/orders/queries";
import { updateOrderStatus } from "@/features/orders/status";
import { withBakeryRoute } from "@/features/auth/guard";
import { readJson } from "@/lib/api/handler";
import type { RouteParams } from "@/lib/api/params";
import { updateOrderSchema, updateOrderStatusSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: RouteParams<"id">) {
  return withBakeryRoute(request, async (tenant) => getOrderById(tenant, (await params).id));
}

/** The order changed as a whole while it is open (plan §139.11.13). */
export async function PUT(request: Request, { params }: RouteParams<"id">) {
  return withBakeryRoute(request, async (tenant) =>
    updateOrder(tenant, (await params).id, await readJson(request, updateOrderSchema)),
  );
}

/** Moves the order to another status (§139.11.8). */
export async function PATCH(request: Request, { params }: RouteParams<"id">) {
  return withBakeryRoute(request, async (tenant) =>
    updateOrderStatus(tenant, (await params).id, await readJson(request, updateOrderStatusSchema)),
  );
}
