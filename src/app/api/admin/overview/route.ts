import { readOverview } from "@/features/admin/api";
import { withDevRoute } from "@/features/auth/guard";

export const runtime = "nodejs";

/** The platform at a glance, for the developer console (plan §37). DEV only. */
export async function GET(request: Request) {
  return withDevRoute(request, ({ admin }) => readOverview(admin));
}
