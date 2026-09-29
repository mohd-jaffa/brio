import { sweepDueOrders } from "@/features/notifications/due";
import { assertCronRequest } from "@/lib/api/cron";
import { withApiHandler } from "@/lib/api/handler";

export const runtime = "nodejs";

/** The database's scheduler, every five minutes (0031_web_push.sql): look for orders due, and push them (R8.6). */
export async function POST(request: Request) {
  return withApiHandler(request, async () => {
    assertCronRequest(request);
    return sweepDueOrders();
  });
}
