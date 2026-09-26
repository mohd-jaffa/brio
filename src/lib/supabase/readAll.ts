import type { PostgrestError } from "@supabase/supabase-js";

import { API_MAX_ROWS } from "@/constants/limits";
import { fromPostgrestError } from "@/lib/errors/fromSupabaseError";

/**
 * Every row a query matches, read a window at a time. One read stops at the
 * API's row limit (`API_MAX_ROWS`) without saying so, and a sum over what it
 * returned — a year of sales, a customer's spend — would be quietly short.
 *
 * `window(from, to)` builds the query afresh for each window, with `.range`
 * on it, ordered by something unique, so no row is read twice or skipped.
 * It stops at the first window that comes back short.
 */
export async function readAll<T>(
  window: (from: number, to: number) => PromiseLike<{ data: unknown; error: PostgrestError | null }>,
  size: number = API_MAX_ROWS,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += size) {
    const { data, error } = await window(from, from + size - 1);
    if (error) throw fromPostgrestError(error);
    const chunk = (data ?? []) as T[];
    rows.push(...chunk);
    if (chunk.length < size) return rows;
  }
}
