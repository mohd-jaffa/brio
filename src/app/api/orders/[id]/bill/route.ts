import { withBakeryRoute } from "@/features/auth/guard";
import { getBill } from "@/features/receipts/api";
import type { RouteParams } from "@/lib/api/params";

export const runtime = "nodejs";

// The bill view-model (plan §139.13): built on demand, never stored (AGENTS.md §15).
export async function GET(request: Request, { params }: RouteParams<"id">) {
  return withBakeryRoute(request, async (tenant) => getBill(tenant, (await params).id));
}
