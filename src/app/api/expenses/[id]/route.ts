import { deleteExpense, getExpenseById, updateExpense } from "@/features/expenses/api";
import { withBakeryRoute } from "@/features/auth/guard";
import { readJson } from "@/lib/api/handler";
import type { RouteParams } from "@/lib/api/params";
import { updateExpenseSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: RouteParams<"id">) {
  return withBakeryRoute(request, async ({ supabase, bakeryId }) =>
    getExpenseById(supabase, bakeryId, (await params).id),
  );
}

export async function PATCH(request: Request, { params }: RouteParams<"id">) {
  return withBakeryRoute(request, async ({ supabase, bakeryId }) =>
    updateExpense(supabase, bakeryId, (await params).id, await readJson(request, updateExpenseSchema)),
  );
}

export async function DELETE(request: Request, { params }: RouteParams<"id">) {
  return withBakeryRoute(request, async ({ supabase, bakeryId }) => {
    await deleteExpense(supabase, bakeryId, (await params).id);
    return { deleted: true };
  });
}
