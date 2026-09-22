import { withApiHandler } from "@/shared/api/handler";
import { createSupabaseServiceRoleClient } from "@/infrastructure/supabase/server";
import { getOverview } from "@/features/analytics/api";

export async function GET(request: Request) {
  return withApiHandler(request, async () => {
    // In a real app we'd extract bakeryId from the JWT context
    const bakeryId = "bakery-1"; 
    const client = createSupabaseServiceRoleClient();
    
    const data = await getOverview(client, bakeryId);
    return data;
  });
}
