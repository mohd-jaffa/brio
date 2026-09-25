import { createExpense, getAllExpenses } from "@/features/expenses/api";
import { withBakeryRoute } from "@/features/auth/guard";
import { readJson } from "@/lib/api/handler";
import { createExpenseSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withBakeryRoute(request, (tenant) => getAllExpenses(tenant));
}

export async function POST(request: Request) {
  return withBakeryRoute(
    request,
    async (tenant) => createExpense(tenant, await readJson(request, createExpenseSchema)),
    { successStatus: 201 },
  );
}
