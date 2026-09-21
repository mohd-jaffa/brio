import { NextResponse } from "next/server";
import { withApiHandler } from "@/shared/api/handler";
import { extractSession } from "@/shared/api/extract-session";
import { ProductsService } from "@/modules/products/products.service";
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
    const service = new ProductsService(supabase);
    
    const product = await service.getProductById(session.profile.bakeryId, id);
    return product;
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
    const service = new ProductsService(supabase);
    
    const product = await service.updateProduct(session.profile.bakeryId, id, body);
    return product;
  });
}
