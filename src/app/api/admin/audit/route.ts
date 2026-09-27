import { listAuditLog } from "@/features/admin/api";
import { withDevRoute } from "@/features/auth/guard";
import { readQuery } from "@/lib/api/handler";
import { adminListQuerySchema } from "@/lib/validation";

export const runtime = "nodejs";

/** The audit trail of every business, a page at a time (plan §5, §37). DEV only. */
export async function GET(request: Request) {
  return withDevRoute(request, ({ admin }) => listAuditLog(admin, readQuery(request, adminListQuerySchema)));
}
