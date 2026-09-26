import { withBakeryRoute } from "@/features/auth/guard";
import { createExpense, listExpenses } from "@/features/expenses/api";
import { readJson, readQuery } from "@/lib/api/handler";
import { createExpenseSchema, expenseListQuerySchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withBakeryRoute(request, (tenant) => listExpenses(tenant, readQuery(request, expenseListQuerySchema)));
}

export async function POST(request: Request) {
  return withBakeryRoute(
    request,
    async (tenant) => createExpense(tenant, await readJson(request, createExpenseSchema)),
    { successStatus: 201 },
  );
}
