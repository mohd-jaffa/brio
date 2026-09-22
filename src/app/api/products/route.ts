import { createProduct, getAllProducts } from "@/features/products/api";
import { withBakeryRoute } from "@/features/auth/guard";
import { readJson } from "@/lib/api/handler";
import { createProductSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withBakeryRoute(request, ({ supabase, bakeryId }) => getAllProducts(supabase, bakeryId));
}

export async function POST(request: Request) {
  return withBakeryRoute(
    request,
    async ({ supabase, bakeryId }) => createProduct(supabase, bakeryId, await readJson(request, createProductSchema)),
    { successStatus: 201 },
  );
}
