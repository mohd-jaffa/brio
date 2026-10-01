/**
 * How long the audit trail and the error log are kept (the user, 2026-09-30:
 * "both error logs and audit logs will be cleared in 7 days"). The same as
 * `clean_up_logs()` (0036_error_logs.sql); a test keeps them equal.
 */
export const LOG_KEEP_DAYS = 7;

/**
 * How much of a failure an error log row keeps: enough to find the fault, and
 * a bound on what one runaway message or stack can take.
 */
export const ERROR_LOG_LIMITS = {
  message: 500,
  detail: 2_000,
  stack: 8_000,
  path: 500,
} as const;
