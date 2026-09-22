import { withApiHandler } from "@/shared/api/handler";
import { extractSession } from "@/shared/api/extract-session";
import { getExpenseById, updateExpense, deleteExpense } from "@/features/expenses/api";
import { createSupabaseAnonClient } from "@/infrastructure/supabase/server";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withApiHandler(request, async () => {
    const session = await extractSession(request);
    const { id } = await params;
    const supabase = createSupabaseAnonClient(session.accessToken);
    return getExpenseById(supabase, session.profile.bakeryId, id);
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withApiHandler(request, async () => {
    const session = await extractSession(request);
    const { id } = await params;
    const body = await request.json();
    const supabase = createSupabaseAnonClient(session.accessToken);
    return updateExpense(supabase, session.profile.bakeryId, id, body);
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withApiHandler(request, async () => {
    const session = await extractSession(request);
    const { id } = await params;
    const supabase = createSupabaseAnonClient(session.accessToken);
    await deleteExpense(supabase, session.profile.bakeryId, id);
    return { success: true };
  });
}
