import { createOrder } from "@/features/orders/checkout";
import { getAllOrders } from "@/features/orders/queries";
import { withBakeryRoute } from "@/features/auth/guard";
import { readJson } from "@/lib/api/handler";
import { createOrderSchema, orderListQuerySchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withBakeryRoute(request, async (tenant) => {
    const { searchParams } = new URL(request.url);
    const filter = orderListQuerySchema.parse({ customer: searchParams.get("customer") ?? undefined });
    return getAllOrders(tenant, filter);
  });
}

export async function POST(request: Request) {
  return withBakeryRoute(
    request,
    async (tenant) => createOrder(tenant, await readJson(request, createOrderSchema)),
    { successStatus: 201 },
  );
}
