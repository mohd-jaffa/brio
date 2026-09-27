import { listAccounts } from "@/features/admin/api";
import { withDevRoute } from "@/features/auth/guard";
import { readQuery } from "@/lib/api/handler";
import { adminListQuerySchema } from "@/lib/validation";

export const runtime = "nodejs";

/** Every account, a page at a time, for the developer console (plan §37). DEV only. */
export async function GET(request: Request) {
  return withDevRoute(request, ({ admin }) => listAccounts(admin, readQuery(request, adminListQuerySchema)));
}
