import { withBakeryRoute } from "@/features/auth/guard";
import { markNotificationRead } from "@/features/notifications/api";
import type { RouteParams } from "@/lib/api/params";
import { notificationIdSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: RouteParams<"id">) {
  return withBakeryRoute(request, async (tenant) =>
    markNotificationRead(tenant, notificationIdSchema.parse((await params).id)),
  );
}
