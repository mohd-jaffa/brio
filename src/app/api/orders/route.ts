import { createOrder } from "@/features/orders/checkout";
import { getAllOrders } from "@/features/orders/queries";
import { withBakeryRoute } from "@/features/auth/guard";
import { readJson } from "@/lib/api/handler";
import { createOrderSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withBakeryRoute(request, ({ supabase, bakeryId }) => getAllOrders(supabase, bakeryId));
}

export async function POST(request: Request) {
  return withBakeryRoute(
    request,
    async ({ supabase, bakeryId }) => createOrder(supabase, bakeryId, await readJson(request, createOrderSchema)),
    { successStatus: 201 },
  );
}
