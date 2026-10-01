import { listErrorLog } from "@/features/admin/api";
import { withDevRoute } from "@/features/auth/guard";
import { readQuery } from "@/lib/api/handler";
import { adminErrorQuerySchema } from "@/lib/validation";

export const runtime = "nodejs";

/** What failed on the server, a page at a time (plan §37, §103). DEV only. */
export async function GET(request: Request) {
  return withDevRoute(request, ({ admin }) => listErrorLog(admin, readQuery(request, adminErrorQuerySchema)));
}
