import { withBakeryRoute } from "@/features/auth/guard";
import { countUnreadAfterDue } from "@/features/notifications/due";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withBakeryRoute(request, (tenant) => countUnreadAfterDue(tenant));
}
