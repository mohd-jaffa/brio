import { NextResponse } from "next/server";
import { withApiHandler } from "@/shared/api/handler";
import { extractSession } from "@/shared/api/extract-session";
import { ExpensesService } from "@/modules/expenses/expenses.service";
import { createSupabaseAnonClient } from "@/infrastructure/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withApiHandler(request, async () => {
    const session = await extractSession(request);
    
    const supabase = createSupabaseAnonClient(session.accessToken);
    const service = new ExpensesService(supabase);
    
    const expenses = await service.getAllExpenses(session.profile.bakeryId);
    return expenses;
  });
}

export async function POST(request: Request) {
  return withApiHandler(request, async () => {
    const session = await extractSession(request);
    const body = await request.json();
    
    const supabase = createSupabaseAnonClient(session.accessToken);
    const service = new ExpensesService(supabase);
    
    const expense = await service.createExpense(session.profile.bakeryId, body);
    return expense;
  });
}
