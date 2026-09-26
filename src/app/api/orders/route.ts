import { withBakeryRoute } from "@/features/auth/guard";
import { createOrder } from "@/features/orders/checkout";
import { listOrders } from "@/features/orders/list";
import { readJson, readQuery } from "@/lib/api/handler";
import { readIdempotencyKey } from "@/lib/api/idempotency";
import { createOrderSchema, orderListQuerySchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withBakeryRoute(request, (tenant) => listOrders(tenant, readQuery(request, orderListQuerySchema)));
}

export async function POST(request: Request) {
  return withBakeryRoute(
    request,
    async (tenant) => createOrder(tenant, await readJson(request, createOrderSchema), readIdempotencyKey(request)),
    { successStatus: 201 },
  );
}
