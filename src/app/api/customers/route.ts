import { withBakeryRoute } from "@/features/auth/guard";
import { createCustomer, listCustomers } from "@/features/customers/api";
import { readJson, readQuery } from "@/lib/api/handler";
import { createCustomerSchema, customerListQuerySchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withBakeryRoute(request, (tenant) => listCustomers(tenant, readQuery(request, customerListQuerySchema)));
}

export async function POST(request: Request) {
  return withBakeryRoute(
    request,
    async (tenant) => createCustomer(tenant, await readJson(request, createCustomerSchema)),
    { successStatus: 201 },
  );
}
