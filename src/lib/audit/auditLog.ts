import { captureError } from "@/lib/audit/errorLog";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import type { Tenant } from "@/lib/supabase/tenant";

import type { AuditEntry } from "./types";

/**
 * Records a business mutation (AGENTS.md §11), with who made it (plan §133.7
 * G1). The trail is written by the server only (BUG-20): a signed-in user may
 * read their business's audit rows but not insert one, so the row goes in
 * through the service role, with the business and the acting user taken from
 * the tenant the route built from the session — never from the entry.
 *
 * A failure is logged and swallowed: the change it describes has already
 * happened, and refusing it now would report a failure that did not occur.
 */
export async function logActionSafe(tenant: Tenant, entry: AuditEntry): Promise<void> {
  const { error } = await createSupabaseServiceRoleClient()
    .from("audit_logs")
    .insert({ ...entry, bakery_id: tenant.bakeryId, user_id: tenant.actorId });

  if (error) {
    await captureError({
      message: "Failed to write audit log",
      error,
      userId: tenant.actorId,
      bakeryId: tenant.bakeryId,
      context: { action: entry.action, entityType: entry.entity_type, entityId: entry.entity_id },
    });
  }
}
