import { NextResponse } from "next/server";
import { withApiHandler } from "@/shared/api/handler";
import { extractSession } from "@/shared/api/extract-session";
import { CustomersService } from "@/modules/customers/customers.service";
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
    const service = new CustomersService(supabase);
    
    const customer = await service.getCustomerById(session.profile.bakeryId, id);
    return customer;
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
    const service = new CustomersService(supabase);
    
    const customer = await service.updateCustomer(session.profile.bakeryId, id, body);
    return customer;
  });
}
