import { NextResponse } from "next/server";
import { withApiHandler } from "@/shared/api/handler";
import { extractSession } from "@/shared/api/extract-session";
import { ProductsService } from "@/features/products/service";
import { createSupabaseAnonClient } from "@/infrastructure/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withApiHandler(request, async () => {
    const session = await extractSession(request);
    
    const supabase = createSupabaseAnonClient(session.accessToken);
    const service = new ProductsService(supabase);
    
    const products = await service.getAllProducts(session.profile.bakeryId);
    return products;
  });
}

export async function POST(request: Request) {
  return withApiHandler(request, async () => {
    const session = await extractSession(request);
    const body = await request.json();
    
    const supabase = createSupabaseAnonClient(session.accessToken);
    const service = new ProductsService(supabase);
    
    const product = await service.createProduct(session.profile.bakeryId, body);
    return product;
  });
}
