import { NextResponse } from "next/server";
import { withApiHandler } from "@/shared/api/handler";
import { extractSession } from "@/shared/api/extract-session";
import { ExpensesService } from "@/features/expenses/service";
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
    const service = new ExpensesService(supabase);
    
    const expense = await service.getExpenseById(session.profile.bakeryId, id);
    return expense;
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
    const service = new ExpensesService(supabase);
    
    const expense = await service.updateExpense(session.profile.bakeryId, id, body);
    return expense;
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
    const service = new ExpensesService(supabase);
    
    await service.deleteExpense(session.profile.bakeryId, id);
    return { success: true };
  });
}
