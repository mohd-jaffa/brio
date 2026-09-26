import { withBakeryRoute } from "@/features/auth/guard";
import { getExpenseSummary } from "@/features/expenses/api";
import { readQuery } from "@/lib/api/handler";
import { rangeQuerySchema } from "@/lib/validation";

export const runtime = "nodejs";

/** Expenses for a period (plan §139.11.11): `?range=&from=&to=&interval=`. */
export async function GET(request: Request) {
  return withBakeryRoute(request, (tenant) => getExpenseSummary(tenant, readQuery(request, rangeQuerySchema)));
}
