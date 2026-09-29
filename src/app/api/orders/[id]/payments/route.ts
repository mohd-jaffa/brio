import { findPaymentsByOrderId, processPayment } from "@/features/payments/api";
import { withBakeryRoute } from "@/features/auth/guard";
import { readJson } from "@/lib/api/handler";
import { readIdempotencyKey } from "@/lib/api/idempotency";
import type { RouteParams } from "@/lib/api/params";
import { createPaymentSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: RouteParams<"id">) {
  return withBakeryRoute(request, async (tenant) => findPaymentsByOrderId(tenant, (await params).id));
}

export async function POST(request: Request, { params }: RouteParams<"id">) {
  return withBakeryRoute(
    request,
    async (tenant) => {
      // The order the payment belongs to comes from the path, never the body.
      const body = { ...((await readJson(request)) as object), order_id: (await params).id };
      return processPayment(tenant, createPaymentSchema.parse(body), readIdempotencyKey(request));
    },
    { successStatus: 201 },
  );
}
