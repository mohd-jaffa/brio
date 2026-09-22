import type { PostgrestMaybeSingleResponse } from "@supabase/supabase-js";

import type { ErrorMessageCode } from "@/constants/messages";
import { AppError } from "@/lib/errors/AppError";
import { fromPostgrestError, kindOf } from "@/lib/errors/fromSupabaseError";

/**
 * The row a write changed — or, when it changed none, the refusal it names.
 *
 * Row-level security does not refuse an UPDATE or DELETE of a row the caller
 * may not change: it hides the row, the write matches nothing, and PostgREST
 * answers as though it had worked. So a write by id asks for its row back —
 * `.select(…).maybeSingle()` — and is awaited through here, which reads no row
 * as the refusal and never as done. Asking for the row is allowed wherever the
 * write is: every table's UPDATE and DELETE policies sit inside its SELECT
 * policy (AGENTS.md §7).
 *
 * `refusal` says what went wrong in the baker's terms — most often that the
 * record has gone, or belongs to another bakery, which read the same from here.
 *
 * Name the row's type when the row is used — `requireRow<CustomerRow>(…)`.
 */
export async function requireRow<T>(
  write: PromiseLike<PostgrestMaybeSingleResponse<T>>,
  refusal: ErrorMessageCode,
): Promise<T> {
  const { data, error } = await write;
  if (error) throw fromPostgrestError(error);
  if (data === null) throw new AppError({ kind: kindOf(refusal), code: refusal });
  return data;
}
