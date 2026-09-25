import { getOverview } from "@/features/analytics/api";
import { withBakeryRoute } from "@/features/auth/guard";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withBakeryRoute(request, (tenant) => getOverview(tenant));
}
