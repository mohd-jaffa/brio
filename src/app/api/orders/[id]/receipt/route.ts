import { withApiHandler } from "@/shared/api/handler";
import { createSupabaseServiceRoleClient } from "@/infrastructure/supabase/server";
import { ReceiptsService } from "@/features/receipts/service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withApiHandler(request, async () => {
    const bakeryId = "bakery-1"; 
    const resolvedParams = await params;
    const client = createSupabaseServiceRoleClient();
    const service = new ReceiptsService(client);
    const data = await service.generateReceiptData(bakeryId, resolvedParams.id);
    return data;
  });
}
