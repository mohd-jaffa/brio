import { createProduct, getAllProducts } from "@/features/products/api";
import { withBakeryRoute } from "@/features/auth/guard";
import { readJson } from "@/lib/api/handler";
import { createProductSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withBakeryRoute(request, (tenant) => getAllProducts(tenant));
}

export async function POST(request: Request) {
  return withBakeryRoute(
    request,
    async (tenant) => createProduct(tenant, await readJson(request, createProductSchema)),
    { successStatus: 201 },
  );
}
