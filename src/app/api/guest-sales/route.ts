import { withBakeryRoute } from "@/features/auth/guard";
import { getGuestSales } from "@/features/customers/guests";
import { readQuery } from "@/lib/api/handler";
import { pagedRangeQuerySchema } from "@/lib/validation";

export const runtime = "nodejs";

/** Guest sales (plan §139.11.3): `?range=&from=&to=&cursor=`. */
export async function GET(request: Request) {
  return withBakeryRoute(request, (tenant) => getGuestSales(tenant, readQuery(request, pagedRangeQuerySchema)));
}
