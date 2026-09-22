import { withApiHandler } from "@/shared/api/handler";
import { createSupabaseServiceRoleClient } from "@/infrastructure/supabase/server";
import { AnalyticsService } from "@/features/analytics/service";

export async function GET(request: Request) {
  return withApiHandler(request, async () => {
    // In a real app we'd extract bakeryId from the JWT context
    const bakeryId = "bakery-1"; 
    const client = createSupabaseServiceRoleClient();
    const service = new AnalyticsService(client);
    const data = await service.getOverview(bakeryId);
    return data;
  });
}
