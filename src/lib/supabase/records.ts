import type { SupabaseClient } from "@supabase/supabase-js";

import type { AuditAction } from "@/lib/audit/types";
import { logActionSafe } from "@/lib/audit/auditLog";
import { fromPostgrestError } from "@/lib/errors/fromSupabaseError";

import { pickColumns } from "./columns";
import { requireRow } from "./writes";

/**
 * One bakery's rows in one table. Every feature's reads and writes go through
 * here, so three things are true everywhere without each feature restating
 * them (AGENTS.md §7, §11):
 *
 * - every query is scoped to `bakery_id`, beneath the RLS policies rather than
 *   instead of them;
 * - every write asks for its row back, so a row RLS hides reads as a refusal
 *   and never as success (see requireRow);
 * - every mutation is audited with the row before and after it.
 *
 * An UPDATE writes only the columns named in EDITABLE_COLUMNS for that table —
 * never a row read back, never a form's whole state.
 */
export interface OrderBy {
  column: string;
  ascending?: boolean;
}

export interface TenantRecords<Row extends { id: string }> {
  list(orderBy?: readonly OrderBy[]): Promise<Row[]>;
  find(id: string): Promise<Row>;
  insert(values: Record<string, unknown>): Promise<Row>;
  update<K extends string>(
    id: string,
    patch: Record<string, unknown>,
    columns: readonly K[],
  ): Promise<Row>;
  remove(id: string): Promise<Row>;
}

export function tenantRecords<Row extends { id: string }>(
  client: SupabaseClient,
  table: string,
  bakeryId: string,
): TenantRecords<Row> {
  const scoped = () => client.from(table).select("*").eq("bakery_id", bakeryId);

  const audit = (action: AuditAction, id: string, previous: unknown, next: unknown) =>
    logActionSafe(client, {
      bakery_id: bakeryId,
      user_id: null,
      action,
      entity_type: table,
      entity_id: id,
      previous_data: (previous ?? null) as Record<string, unknown> | null,
      new_data: (next ?? null) as Record<string, unknown> | null,
    });

  async function find(id: string): Promise<Row> {
    return requireRow<Row>(scoped().eq("id", id).maybeSingle(), "RECORD_NOT_FOUND");
  }

  return {
    async list(orderBy: readonly OrderBy[] = []): Promise<Row[]> {
      let query = scoped();
      for (const { column, ascending = true } of orderBy) query = query.order(column, { ascending });

      const { data, error } = await query;
      if (error) throw fromPostgrestError(error);
      return (data ?? []) as Row[];
    },

    find,

    async insert(values: Record<string, unknown>): Promise<Row> {
      const row = await requireRow<Row>(
        client
          .from(table)
          .insert({ ...values, bakery_id: bakeryId })
          .select()
          .maybeSingle(),
        "RECORD_NOT_FOUND",
      );
      await audit("CREATE", row.id, null, row);
      return row;
    },

    async update<K extends string>(
      id: string,
      patch: Record<string, unknown>,
      columns: readonly K[],
    ): Promise<Row> {
      const previous = await find(id);
      const row = await requireRow<Row>(
        client
          .from(table)
          .update(pickColumns(patch, columns) as Record<string, unknown>)
          .eq("bakery_id", bakeryId)
          .eq("id", id)
          .select()
          .maybeSingle(),
        "RECORD_NOT_FOUND",
      );
      await audit("UPDATE", row.id, previous, row);
      return row;
    },

    async remove(id: string): Promise<Row> {
      const row = await requireRow<Row>(
        client.from(table).delete().eq("bakery_id", bakeryId).eq("id", id).select().maybeSingle(),
        "RECORD_NOT_FOUND",
      );
      await audit("DELETE", row.id, row, null);
      return row;
    },
  };
}
