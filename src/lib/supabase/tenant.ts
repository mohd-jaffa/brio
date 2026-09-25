import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Who is acting, for which business, through which client (plan §133.7 G1).
 * Every feature's data functions take this rather than `(client, bakeryId)`,
 * so the acting user reaches the audit trail without the argument list
 * growing. A route builds it from the session (`withBakeryRoute`), never from
 * anything the request says.
 */
export interface Tenant {
  /** Carries the caller's token, so every read and write runs under their RLS policies. */
  supabase: SupabaseClient;
  bakeryId: string;
  /** The signed-in user acting, recorded on every audit row. */
  actorId: string;
}
