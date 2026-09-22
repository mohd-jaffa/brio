import type { PostgrestMaybeSingleResponse } from '@supabase/supabase-js';
import { ERROR_MESSAGES, type ErrorMessageCode } from '@/constants/messages';
import { AppError } from '@/lib/errors/AppError';
import { fromPostgrestError, kindOf } from '@/lib/errors/fromSupabaseError';

export async function requireRow<T>(
  write: PromiseLike<PostgrestMaybeSingleResponse<T>>,
  refusal: ErrorMessageCode
): Promise<T> {
  const { data, error } = await write;
  if (error) throw fromPostgrestError(error);
  if (data === null) throw new AppError({ ...kindOf(refusal), message: ERROR_MESSAGES[refusal] });
  return data;
}
