/**
 * Every word the app says, in one place (AGENTS.md §5). No screen, route or
 * schema writes a message inline: a wording is changed here once, and the
 * server and the client cannot end up saying different things about the same
 * failure.
 */

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

  SAVE_FAILED: "Could not save your changes. Please try again.",
  UPLOAD_FAILED: "Could not upload the file.",
  RECORD_NOT_FOUND: "That record could not be found. Refresh and try again.",

  // What a list says when its own load fails, so each screen names its subject.
  CUSTOMERS_LOAD_FAILED: "Could not load your customers. Please try again.",
  PRODUCTS_LOAD_FAILED: "Could not load your products. Please try again.",
  ORDERS_LOAD_FAILED: "Could not load your orders. Please try again.",
  INVENTORY_LOAD_FAILED: "Could not load your stock. Please try again.",
  EXPENSES_LOAD_FAILED: "Could not load your expenses. Please try again.",
  ANALYTICS_LOAD_FAILED: "Could not load your analytics. Please try again.",
  DASHBOARD_LOAD_FAILED: "Could not load your dashboard. Please try again.",
  ORDER_LOAD_FAILED: "Could not load this order. Please try again.",
  CUSTOMER_LOAD_FAILED: "Could not load this customer. Please try again.",
  RECEIPT_LOAD_FAILED: "Could not build this bill. Please try again.",

  ORDER_STATUS_UPDATE_FAILED: "Could not update this order. Please try again.",
  PAYMENT_FAILED: "Could not record this payment. Please try again.",
  STOCK_UPDATE_FAILED: "Could not update stock. Please try again.",
} as const;

export type ErrorMessageCode = keyof typeof ERROR_MESSAGES;

export function isErrorMessageCode(code: string | null | undefined): code is ErrorMessageCode {
  return code != null && Object.prototype.hasOwnProperty.call(ERROR_MESSAGES, code);
}

export function getErrorMessage(code: ErrorMessageCode | string): string {
  return isErrorMessageCode(code) ? ERROR_MESSAGES[code] : ERROR_MESSAGES.INTERNAL_ERROR;
}

/** What a field says when what was typed into it cannot be used. */
export const VALIDATION_MESSAGES = {
  required: (label: string) => `${label} needs a value.`,
  wholeNumber: (label: string) => `${label} must be a whole number.`,
  number: (label: string) => `${label} must be a valid number.`,
  notNegative: (label: string) => `${label} cannot be negative.`,
  amount: (label: string) => `${label} must be a valid amount.`,
  email: (label: string) => `${label} must look like name@example.com.`,
  url: (label: string) => `${label} must be a valid link.`,
  phone: "Enter a valid mobile number.",
  chooseOne: (label: string) => `Choose a ${label}.`,
  chooseAtLeastOne: (label: string) => `Choose at least one ${label}.`,
  moreThanZero: (label: string) => `${label} must be more than 0.`,
  tooLong: (label: string, max: number) => `${label} can be at most ${max} characters.`,
  invalid: "That value is not valid.",
} as const;

/** The words on buttons, headings and empty states, so no screen invents its own. */
export const UI_TEXT = {
  appName: "Ovenly",
  appTagline: "Home Bakery",

  actions: {
    save: "Save",
    saving: "Saving…",
    cancel: "Cancel",
    close: "Close",
    retry: "Try again",
    delete: "Delete",
    edit: "Edit",
    search: "Search…",
  },

  states: {
    loading: "Loading…",
    noResults: (term: string) => `Nothing matches “${term}”.`,
  },
} as const;
