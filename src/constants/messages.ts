export const ERROR_MESSAGES = {
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

  // Adding explicit UI errors that were previously inline
  SAVE_FAILED: "Could not save your changes. Please try again.",
  UPLOAD_FAILED: "Could not upload the file.",
  RECORD_NOT_FOUND: "That record could not be found. Refresh and try again.",
} as const;

export type ErrorMessageCode = keyof typeof ERROR_MESSAGES;

export function isErrorMessageCode(code: string | null | undefined): code is ErrorMessageCode {
  return code != null && Object.prototype.hasOwnProperty.call(ERROR_MESSAGES, code);
}

export function getErrorMessage(code: ErrorMessageCode | string) {
  if (isErrorMessageCode(code)) {
    return ERROR_MESSAGES[code];
  }
  return ERROR_MESSAGES.INTERNAL_ERROR;
}

export const VALIDATION_MESSAGES = {
  required: (label: string) => `${label} needs a value.`,
  wholeNumber: (label: string) => `${label} must be a whole number.`,
  number: (label: string) => `${label} must be a valid number.`,
  notNegative: (label: string) => `${label} cannot be negative.`,
  amount: (label: string) => `${label} must be a valid amount.`,
  email: (label: string) => `${label} must look like name@example.com.`,
  phone: "Enter a valid mobile number.",
  chooseAtLeastOne: (label: string) => `Choose at least one ${label}.`,
  moreThanZero: (label: string) => `${label} must be more than 0.`,
  tooLong: (label: string, max: number) => `${label} can be at most ${max} characters.`,
  invalid: "That value is not valid.",
} as const;
