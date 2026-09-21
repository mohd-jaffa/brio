export const ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  VALIDATION_INVALID_JSON: "VALIDATION_INVALID_JSON",

  AUTH_INVALID_CREDENTIALS: "AUTH_INVALID_CREDENTIALS",
  AUTH_SESSION_REQUIRED: "AUTH_SESSION_REQUIRED",
  AUTH_SESSION_INVALID: "AUTH_SESSION_INVALID",
  AUTH_ACCOUNT_INACTIVE: "AUTH_ACCOUNT_INACTIVE",
  AUTH_ACCOUNT_NOT_CONFIRMED: "AUTH_ACCOUNT_NOT_CONFIRMED",
  AUTH_PASSWORD_CHANGE_REQUIRED: "AUTH_PASSWORD_CHANGE_REQUIRED",
  AUTH_ROLE_FORBIDDEN: "AUTH_ROLE_FORBIDDEN",
  AUTH_EMAIL_ALREADY_EXISTS: "AUTH_EMAIL_ALREADY_EXISTS",
  AUTH_PHONE_ALREADY_EXISTS: "AUTH_PHONE_ALREADY_EXISTS",

  CONFIG_INVALID: "CONFIG_INVALID",
  MAIL_PROVIDER_NOT_CONFIGURED: "MAIL_PROVIDER_NOT_CONFIGURED",
  EXTERNAL_SERVICE_ERROR: "EXTERNAL_SERVICE_ERROR",
  CONFLICT: "CONFLICT",
  NOT_FOUND: "NOT_FOUND",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  VALIDATION_ERROR: "Please check the highlighted fields.",
  VALIDATION_INVALID_JSON: "The request body must be valid JSON.",

  AUTH_INVALID_CREDENTIALS: "The phone number or password is incorrect.",
  AUTH_SESSION_REQUIRED: "Please sign in to continue.",
  AUTH_SESSION_INVALID: "Your session is invalid or has expired.",
  AUTH_ACCOUNT_INACTIVE: "This account is inactive. Please contact support.",
  AUTH_ACCOUNT_NOT_CONFIRMED: "Please confirm your account before continuing.",
  AUTH_PASSWORD_CHANGE_REQUIRED: "Please change your temporary password before continuing.",
  AUTH_ROLE_FORBIDDEN: "You do not have permission to perform this action.",
  AUTH_EMAIL_ALREADY_EXISTS: "An account with this email address already exists.",
  AUTH_PHONE_ALREADY_EXISTS: "An account with this phone number already exists.",

  CONFIG_INVALID: "The server configuration is invalid.",
  MAIL_PROVIDER_NOT_CONFIGURED: "Email delivery is not configured.",
  EXTERNAL_SERVICE_ERROR: "A connected service could not complete the request.",
  CONFLICT: "This action conflicts with existing data.",
  NOT_FOUND: "The requested resource was not found.",
  INTERNAL_ERROR: "Something went wrong. Please try again.",
};

export function getErrorMessage(code: ErrorCode) {
  return ERROR_MESSAGES[code] ?? ERROR_MESSAGES.INTERNAL_ERROR;
}
