import type { PostgrestError } from '@supabase/supabase-js';
import { ERROR_MESSAGES, isErrorMessageCode, type ErrorMessageCode } from '@/constants/messages';
import { AppError, type ErrorCode } from '@/lib/errors/AppError';

const POSTGRES_ERRORS: Record<string, { code: ErrorCode; httpStatus: number; message: ErrorMessageCode }> = {
  '42501': { code: 'FORBIDDEN', httpStatus: 403, message: 'AUTH_ROLE_FORBIDDEN' },
  '40P01': { code: 'CONFLICT', httpStatus: 409, message: 'CONFLICT' },
  '40001': { code: 'CONFLICT', httpStatus: 409, message: 'CONFLICT' },
  '23502': { code: 'VALIDATION_FAILED', httpStatus: 422, message: 'VALIDATION_ERROR' },
  '22P02': { code: 'VALIDATION_FAILED', httpStatus: 422, message: 'VALIDATION_ERROR' },
  PGRST116: { code: 'NOT_FOUND', httpStatus: 404, message: 'NOT_FOUND' },
  PGRST301: { code: 'AUTH_SESSION_EXPIRED', httpStatus: 401, message: 'AUTH_SESSION_INVALID' },
};

export function kindOf(code: ErrorMessageCode): { code: ErrorCode; httpStatus: number } {
  if (code === 'AUTH_SESSION_REQUIRED' || code === 'AUTH_SESSION_INVALID') {
    return { code: 'UNAUTHENTICATED', httpStatus: 401 };
  }
  if (code === 'AUTH_ROLE_FORBIDDEN') return { code: 'FORBIDDEN', httpStatus: 403 };
  if (code === 'NOT_FOUND' || code === 'RECORD_NOT_FOUND') return { code: 'NOT_FOUND', httpStatus: 404 };
  if (code === 'CONFLICT' || code === 'AUTH_EMAIL_ALREADY_EXISTS' || code === 'AUTH_PHONE_ALREADY_EXISTS') {
    return { code: 'CONFLICT', httpStatus: 409 };
  }
  return { code: 'VALIDATION_FAILED', httpStatus: 422 };
}

export function fromPostgrestError(err: PostgrestError): AppError {
  if (err.code === '23505') {
    return new AppError({
      code: 'CONFLICT',
      message: ERROR_MESSAGES.CONFLICT,
      httpStatus: 409,
      cause: err,
    });
  }

  if (err.code === 'P0001' && isErrorMessageCode(err.hint)) {
    const code = err.hint;
    const message = ERROR_MESSAGES[code];
    return new AppError({ ...kindOf(code), message, cause: err });
  }

  const mapped = POSTGRES_ERRORS[err.code];
  if (mapped) return new AppError({ ...mapped, message: ERROR_MESSAGES[mapped.message], cause: err });

  return new AppError({ code: 'INTERNAL', message: ERROR_MESSAGES.INTERNAL_ERROR, httpStatus: 500, cause: err });
}
