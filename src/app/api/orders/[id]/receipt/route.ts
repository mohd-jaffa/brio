import { generateReceiptData } from "@/features/receipts/api";
import { withBakeryRoute } from "@/features/auth/guard";
import type { RouteParams } from "@/lib/api/params";

export const runtime = "nodejs";

// Receipts are generated on demand and never stored (AGENTS.md §15).
export async function GET(request: Request, { params }: RouteParams<"id">) {
  return withBakeryRoute(request, async (tenant) =>
    generateReceiptData(tenant, (await params).id),
  );
}
