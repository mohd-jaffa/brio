import { createCustomer, getAllCustomers } from "@/features/customers/api";
import { withBakeryRoute } from "@/features/auth/guard";
import { readJson } from "@/lib/api/handler";
import { createCustomerSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withBakeryRoute(request, ({ supabase, bakeryId }) => getAllCustomers(supabase, bakeryId));
}

export async function POST(request: Request) {
  return withBakeryRoute(
    request,
    async ({ supabase, bakeryId }) => createCustomer(supabase, bakeryId, await readJson(request, createCustomerSchema)),
    { successStatus: 201 },
  );
}
