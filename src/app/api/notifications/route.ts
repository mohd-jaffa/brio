import { withBakeryRoute } from "@/features/auth/guard";
import { listNotificationsAfterDue } from "@/features/notifications/due";
import { readQuery } from "@/lib/api/handler";
import { notificationListQuerySchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withBakeryRoute(request, (tenant) =>
    listNotificationsAfterDue(tenant, readQuery(request, notificationListQuerySchema)),
  );
}
