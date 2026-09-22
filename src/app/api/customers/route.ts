import { NextResponse } from "next/server";
import { withApiHandler } from "@/shared/api/handler";
import { extractSession } from "@/shared/api/extract-session";
import { CustomersService } from "@/features/customers/service";
import { createSupabaseAnonClient } from "@/infrastructure/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withApiHandler(request, async () => {
    const session = await extractSession(request);
    
    // Use the authenticated anon client to inherit RLS contexts
    const supabase = createSupabaseAnonClient(session.accessToken);
    const service = new CustomersService(supabase);
    
    const customers = await service.getAllCustomers(session.profile.bakeryId);
    return customers;
  });
}

export async function POST(request: Request) {
  return withApiHandler(request, async () => {
    const session = await extractSession(request);
    const body = await request.json();
    
    const supabase = createSupabaseAnonClient(session.accessToken);
    const service = new CustomersService(supabase);
    
    const customer = await service.createCustomer(session.profile.bakeryId, body);
    return customer;
  });
}
