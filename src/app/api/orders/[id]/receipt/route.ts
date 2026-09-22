import { withApiHandler } from "@/shared/api/handler";
import { createSupabaseServiceRoleClient } from "@/infrastructure/supabase/server";
import { generateReceiptData } from "@/features/receipts/api";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withApiHandler(request, async () => {
    const bakeryId = "bakery-1"; 
    const resolvedParams = await params;
    const client = createSupabaseServiceRoleClient();
    
    const data = await generateReceiptData(client, bakeryId, resolvedParams.id);
    return data;
  });
}
