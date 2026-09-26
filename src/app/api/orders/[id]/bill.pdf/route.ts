import { withBakeryRoute } from "@/features/auth/guard";
import { getBillPdf } from "@/features/receipts/api";
import type { RouteParams } from "@/lib/api/params";
import { toTheme } from "@/lib/theme/themes";

export const runtime = "nodejs";

// The bill's PDF (plan §139.13): made on demand in the page's theme, never stored (AGENTS.md §15).
export async function GET(request: Request, { params }: RouteParams<"id">) {
  return withBakeryRoute(request, async (tenant) =>
    getBillPdf(tenant, (await params).id, toTheme(new URL(request.url).searchParams.get("theme"))),
  );
}
