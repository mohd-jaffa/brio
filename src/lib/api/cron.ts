import { timingSafeEqual } from "node:crypto";

import { getServerEnv } from "@/lib/env/server";
import { authenticationError } from "@/lib/errors";

/**
 * Refuses a request that does not carry the database scheduler's secret
 * (`CRON_SECRET`; 0031_web_push.sql) as its bearer token. Compared in constant
 * time; with no secret set, every request is refused and the route is closed.
 */
export function assertCronRequest(request: Request, secret: string | undefined = getServerEnv().CRON_SECRET): void {
  const given = Buffer.from(request.headers.get("authorization")?.match(/^Bearer (\S+)$/)?.[1] ?? "");
  const expected = Buffer.from(secret ?? "");
  const allowed = expected.length > 0 && given.length === expected.length && timingSafeEqual(given, expected);
  if (!allowed) throw authenticationError("CRON_UNAUTHORIZED");
}
