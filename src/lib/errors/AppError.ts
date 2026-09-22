import { ERROR_MESSAGES } from '@/constants/messages';

export type ErrorCode =
  | 'AUTH_INVALID_CREDENTIALS'
  | 'AUTH_SESSION_EXPIRED'
  | 'RLS_DENIED'
  | 'VALIDATION_FAILED'
  | 'NOT_FOUND'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'NETWORK'
  | 'INTERNAL';

export interface AppErrorShape {
  code: ErrorCode;
  message: string;
  traceId: string;
}

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly traceId: string;
  readonly httpStatus: number;
  readonly cause?: unknown;

  constructor(params: { code: ErrorCode; message: string; traceId?: string; httpStatus?: number; cause?: unknown }) {
    super(params.message);
    this.name = 'AppError';
    this.code = params.code;
    this.traceId = params.traceId ?? (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `trace_${Date.now()}`);
    this.httpStatus = params.httpStatus ?? 500;
    this.cause = params.cause;
  }

  toJSON(): AppErrorShape {
    return { code: this.code, message: this.message, traceId: this.traceId };
  }
}

export function signInRequired(): AppError {
  return new AppError({ code: 'UNAUTHENTICATED', message: ERROR_MESSAGES.AUTH_SESSION_REQUIRED, httpStatus: 401 });
}
