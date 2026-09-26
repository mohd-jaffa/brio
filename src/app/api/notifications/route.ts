import { withBakeryRoute } from "@/features/auth/guard";
import { listNotifications } from "@/features/notifications/api";
import { readQuery } from "@/lib/api/handler";
import { notificationListQuerySchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withBakeryRoute(request, (tenant) => listNotifications(tenant, readQuery(request, notificationListQuerySchema)));
}
