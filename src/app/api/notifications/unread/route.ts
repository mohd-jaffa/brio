import { withBakeryRoute } from "@/features/auth/guard";
import { countUnread } from "@/features/notifications/api";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withBakeryRoute(request, (tenant) => countUnread(tenant));
}
