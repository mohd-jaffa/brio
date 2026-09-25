import { getBusiness, updateBusiness } from "@/features/business/api";
import { withBakeryRoute } from "@/features/auth/guard";
import { readJson } from "@/lib/api/handler";
import { businessProfileSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withBakeryRoute(request, ({ supabase, bakeryId }) => getBusiness(supabase, bakeryId));
}

export async function PATCH(request: Request) {
  return withBakeryRoute(request, async ({ supabase, bakeryId }) =>
    updateBusiness(supabase, bakeryId, await readJson(request, businessProfileSchema)),
  );
}
