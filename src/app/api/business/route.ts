import { getBusiness, updateBusiness } from "@/features/business/api";
import { withBakeryRoute } from "@/features/auth/guard";
import { readJson } from "@/lib/api/handler";
import { businessProfileSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withBakeryRoute(request, (tenant) => getBusiness(tenant));
}

export async function PATCH(request: Request) {
  return withBakeryRoute(request, async (tenant) =>
    updateBusiness(tenant, await readJson(request, businessProfileSchema)),
  );
}
