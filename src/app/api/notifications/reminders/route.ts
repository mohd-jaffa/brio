import { withBakeryRoute } from "@/features/auth/guard";
import { listReminders } from "@/features/notifications/reminders";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withBakeryRoute(request, (tenant) => listReminders(tenant));
}
