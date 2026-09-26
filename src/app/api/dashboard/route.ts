import { withBakeryRoute } from "@/features/auth/guard";
import { getDashboard } from "@/features/dashboard/api";
import { readQuery } from "@/lib/api/handler";
import { dashboardQuerySchema } from "@/lib/validation";

export const runtime = "nodejs";

/** Home (plan §139.10): `?period=TODAY|WEEK|MONTH&status=&payment=`. */
export async function GET(request: Request) {
  return withBakeryRoute(request, (tenant) => getDashboard(tenant, readQuery(request, dashboardQuerySchema)));
}
