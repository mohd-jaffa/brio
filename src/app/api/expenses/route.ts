import { withApiHandler } from "@/shared/api/handler";
import { extractSession } from "@/shared/api/extract-session";
import { getAllExpenses, createExpense } from "@/features/expenses/api";
import { createSupabaseAnonClient } from "@/infrastructure/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withApiHandler(request, async () => {
    const session = await extractSession(request);
    const supabase = createSupabaseAnonClient(session.accessToken);
    return getAllExpenses(supabase, session.profile.bakeryId);
  });
}

export async function POST(request: Request) {
  return withApiHandler(request, async () => {
    const session = await extractSession(request);
    const body = await request.json();
    const supabase = createSupabaseAnonClient(session.accessToken);
    return createExpense(supabase, session.profile.bakeryId, body);
  });
}
