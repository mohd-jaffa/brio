import { withBakeryRoute } from "@/features/auth/guard";
import { markAllNotificationsRead } from "@/features/notifications/api";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return withBakeryRoute(request, (tenant) => markAllNotificationsRead(tenant));
}
