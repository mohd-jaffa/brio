import { withBakeryRoute } from "@/features/auth/guard";
import { registerDevice } from "@/features/notifications/push";
import { readJson } from "@/lib/api/handler";
import { pushSubscriptionSchema } from "@/lib/validation";

export const runtime = "nodejs";

/** This browser wants the business's order reminders pushed to it (R8.6). */
export async function POST(request: Request) {
  return withBakeryRoute(request, async (tenant) =>
    registerDevice(tenant, await readJson(request, pushSubscriptionSchema)),
  );
}
