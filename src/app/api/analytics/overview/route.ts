import { getAnalytics } from "@/features/analytics/api";
import { withBakeryRoute } from "@/features/auth/guard";
import { readQuery } from "@/lib/api/handler";
import { rangeQuerySchema } from "@/lib/validation";

export const runtime = "nodejs";

/** Analytics (plan §139.13): `?range=LAST_30_DAYS|…|CUSTOM&from=&to=&interval=DAY|WEEK`. */
export async function GET(request: Request) {
  return withBakeryRoute(request, (tenant) => getAnalytics(tenant, readQuery(request, rangeQuerySchema)));
}
