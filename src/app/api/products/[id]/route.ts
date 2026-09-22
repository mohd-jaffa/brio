import { getProductById, updateProduct } from "@/features/products/api";
import { withBakeryRoute } from "@/features/auth/guard";
import { readJson } from "@/lib/api/handler";
import type { RouteParams } from "@/lib/api/params";
import { updateProductSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: RouteParams<"id">) {
  return withBakeryRoute(request, async ({ supabase, bakeryId }) =>
    getProductById(supabase, bakeryId, (await params).id),
  );
}

export async function PATCH(request: Request, { params }: RouteParams<"id">) {
  return withBakeryRoute(request, async ({ supabase, bakeryId }) =>
    updateProduct(supabase, bakeryId, (await params).id, await readJson(request, updateProductSchema)),
  );
}
