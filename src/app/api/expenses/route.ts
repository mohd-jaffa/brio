import { createExpense, getAllExpenses } from "@/features/expenses/api";
import { withBakeryRoute } from "@/features/auth/guard";
import { readJson } from "@/lib/api/handler";
import { createExpenseSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withBakeryRoute(request, ({ supabase, bakeryId }) => getAllExpenses(supabase, bakeryId));
}

export async function POST(request: Request) {
  return withBakeryRoute(
    request,
    async ({ supabase, bakeryId }) => createExpense(supabase, bakeryId, await readJson(request, createExpenseSchema)),
    { successStatus: 201 },
  );
}
