import type { SupabaseClient } from "@supabase/supabase-js";

import type { Tenant } from "@/lib/supabase/tenant";

/** A tenant for a data-layer test: the fake client, one business, and who is acting. */
export function tenantOf(client: unknown, overrides: Partial<Omit<Tenant, "supabase">> = {}): Tenant {
  return { supabase: client as SupabaseClient, bakeryId: "b-1", actorId: "u-1", ...overrides };
}
