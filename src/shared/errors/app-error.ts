import { ERROR_MESSAGES, type ErrorMessageCode, getErrorMessage } from "@/constants/messages";

interface AppErrorOptions {
  code: ErrorMessageCode;
  message?: string;
  statusCode: number;
  details?: unknown;
  cause?: unknown;
}

export class AppError extends Error {
  readonly code: ErrorMessageCode;
  readonly statusCode: number;
  readonly details?: unknown;
  readonly cause?: unknown;
  readonly isOperational = true;

  constructor(options: AppErrorOptions) {
    super(options.message ?? getErrorMessage(options.code));
    this.name = new.target.name;
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.details = options.details;
    this.cause = options.cause;
  }
}

export class ValidationError extends AppError {
  constructor(code: ErrorMessageCode = "VALIDATION_ERROR", details?: unknown) {
    super({ code, statusCode: 400, details });
  }
}

export class AuthenticationError extends AppError {
  constructor(code: ErrorMessageCode = "AUTH_SESSION_INVALID", details?: unknown) {
    super({ code, statusCode: 401, details });
  }
}

export class AuthorizationError extends AppError {
  constructor(code: ErrorMessageCode = "AUTH_ROLE_FORBIDDEN", details?: unknown) {
    super({ code, statusCode: 403, details });
  }
}

export class NotFoundError extends AppError {
  constructor(code: ErrorMessageCode = "NOT_FOUND", details?: unknown) {
    super({ code, statusCode: 404, details });
  }
}

export class ConflictError extends AppError {
  constructor(code: ErrorMessageCode = "CONFLICT", details?: unknown) {
    super({ code, statusCode: 409, details });
  }
}

export class BusinessRuleError extends AppError {
  constructor(code: ErrorMessageCode, details?: unknown) {
    super({ code, statusCode: 422, details });
  }
}

export class ExternalServiceError extends AppError {
  constructor(code: ErrorMessageCode = "EXTERNAL_SERVICE_ERROR", details?: unknown, cause?: unknown) {
    super({ code, statusCode: 502, details, cause });
  }
}

export class InternalServerError extends AppError {
  constructor(code: ErrorMessageCode = "INTERNAL_ERROR", details?: unknown, cause?: unknown) {
    super({ code, statusCode: 500, details, cause });
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  return new InternalServerError("INTERNAL_ERROR", undefined, error);
}
