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
  AUTH_REGISTRATION_FAILED: "Could not create your account. Please try again.",
  AUTH_PASSWORD_CHANGE_FAILED: "Could not change your password. Please try again.",
  AUTH_RESET_REQUEST_FAILED: "Could not send the reset email. Please try again.",
  AUTH_EMAIL_CONFIRM_FAILED: "That confirmation link is invalid or has expired.",
  AUTH_EMAIL_ALREADY_CONFIRMED: "Your email address is already confirmed.",
  AUTH_SIGN_OUT_FAILED: "Could not sign you out. Please try again.",

  CONFIG_INVALID: "The server configuration is invalid.",
  MAIL_PROVIDER_NOT_CONFIGURED: "Email delivery is not configured.",
  EXTERNAL_SERVICE_ERROR: "A connected service could not complete the request.",
  CONFLICT: "This action conflicts with existing data.",
  NOT_FOUND: "The requested resource was not found.",
  INTERNAL_ERROR: "Something went wrong. Please try again.",

  SAVE_FAILED: "Could not save your changes. Please try again.",
  UPLOAD_FAILED: "Could not upload the file.",
  LOGO_TOO_LARGE: "That logo is larger than 500 KB.",
  LOGO_TYPE_NOT_ALLOWED: "Choose a PNG, JPG or WebP image.",
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
  BUSINESS_LOAD_FAILED: "Could not load your business details. Please try again.",

  ORDER_STATUS_UPDATE_FAILED: "Could not update this order. Please try again.",
  ORDER_TOTAL_TOO_LARGE: "An order can come to at most ₹1,00,00,000. Split it into smaller orders.",
  ORDER_STATUS_TRANSITION_INVALID: "This order can’t move to that status from where it is now.",
  ORDER_STATUS_CHANGED: "This order was just changed somewhere else. Refresh to see where it is now.",
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
  url: (label: string) => `${label} must be a web link starting with https:// or http://.`,
  tooLarge: (label: string, max: string) => `${label} can be at most ${max}.`,
  phone: "Enter a valid mobile number.",
  chooseOne: (label: string) => `Choose a ${label}.`,
  chooseAtLeastOne: (label: string) => `Choose at least one ${label}.`,
  moreThanZero: (label: string) => `${label} must be more than 0.`,
  tooLong: (label: string, max: number) => `${label} can be at most ${max} characters.`,
  tooShort: (label: string, min: number) => `${label} must be at least ${min} characters.`,
  passwordsMustMatch: "Both passwords must be the same.",
  invalid: "That value is not valid.",
} as const;

/** The words on buttons, headings and empty states, so no screen invents its own. */
export const UI_TEXT = {
  appName: "Ovenly",
  appTagline: "Home Business",

  /**
   * The words the four authentication screens share. They are the first thing
   * anyone reads, and a baker signing in after a password reset is sent
   * between three of them, so the wording has to agree across all of them.
   */
  auth: {
    signIn: "Sign in",
    signingIn: "Signing in…",
    signOut: "Sign out",
    createAccount: "Create account",
    creatingAccount: "Creating account…",
    forgotPassword: "Forgot password?",
    backToSignIn: "Back to sign in",
    showPassword: "Show password",
    hidePassword: "Hide password",
    phoneLabel: "Mobile number",
    phoneHint: "The 10-digit number you signed up with.",
    passwordLabel: "Password",
    passwordHint: "At least 8 characters.",
    newPasswordLabel: "New password",
    setNewPassword: "Set new password",
    confirmPasswordLabel: "Confirm password",
    emailLabel: "Email address",
    nameLabel: "Your name",
    businessNameLabel: "Business name",
    // Registration's two steps (plan §139.10).
    stepYou: "You",
    stepBusiness: "Your business",
    stepOf: (step: number, of: number) => `Step ${step} of ${of}`,
    next: "Next",
    back: "Back",
    cityPlaceholder: "e.g. Pune",
    addressPlaceholder: "Where your business is — it is printed on your bills",
    haveAccount: "Already have an account?",
    noAccount: "New to Ovenly?",
    sendResetEmail: "Email me a temporary password",
    resetSent:
      "If that email belongs to an account, a temporary password is on its way. Sign in with it and you will be asked to choose a new one.",
    temporaryPasswordNotice:
      "You signed in with a temporary password. Choose a new one to continue.",
    accountCreated: "Account created. Sign in with your mobile number and password.",
    notConfirmed: "Your email address is not confirmed yet. Use the link in the email we sent you.",
    resendConfirmation: "Resend confirmation",
    confirmationSentTo: (email: string) => `A new link is on its way to ${email}.`,
    checkingSession: "Checking your session…",

    // The line breaks are the composition, so each headline is written as its
    // lines. Neutral for every home business, not only bakers (Q8).
    signInHeadline: ["Good work", "starts here."],
    signInIntro: "Sign in to run your business",
    registerHeadline: ["Grow what", "you make", "at home."],
    registerIntro: "Two short steps, and you are ready for orders",
    promise: "Made at home, run with care.",

    // The three screens behind the front door (plan §138.6). Same voice: a
    // serif line that says where you are, then one sentence of why.
    forgotHeadline: ["Let's get", "you back in."],
    forgotIntro: "Tell us the email your business is registered with",
    changePasswordHeadline: ["A fresh", "password."],
    changePasswordIntro: "Choose the one you will sign in with from now on",
    confirmEmail: "Confirm your email",
    // Neutral on purpose: this screen may be confirming, done, or looking at a
    // link that expired, and one headline has to be true in all three.
    confirmHeadline: ["Nearly", "there."],
    confirmIntro: "The link in your confirmation email finishes setting up your account",
    confirming: "Confirming your email address…",
    confirmed: "Your email address is confirmed. Taking you to your dashboard…",
    confirmLinkMissing: "This page opens from the link in your confirmation email.",
  },

  actions: {
    save: "Save",
    saving: "Saving…",
    cancel: "Cancel",
    close: "Close",
    back: "Go back",
    retry: "Try again",
    delete: "Delete",
    edit: "Edit",
    search: "Search…",
  },

  states: {
    loading: "Loading…",
    noResults: (term: string) => `Nothing matches “${term}”.`,
  },

  /** The response card (plan §139.6). */
  response: {
    reference: (requestId: string) => `Reference: ${requestId}`,
  },

  /**
   * What each action's response card says it came to (plan §139.6): the
   * title says the outcome, short, in the past tense.
   */
  outcomes: {
    customerSaved: "Customer saved",
    customerNotSaved: "Customer not saved",
    productSaved: "Product saved",
    productNotSaved: "Product not saved",
    expenseSaved: "Expense saved",
    expenseNotSaved: "Expense not saved",
    stockRecorded: "Stock recorded",
    stockNotRecorded: "Stock not recorded",
    paymentRecorded: "Payment recorded",
    paymentNotRecorded: "Payment not recorded",
    orderUpdated: "Order updated",
    orderCancelled: "Order cancelled",
    orderNotUpdated: "Order not updated",
    orderNotPlaced: "Order not placed",
    businessSaved: "Business details saved",
    businessNotSaved: "Business details not saved",
    logoUploaded: "Logo updated",
    logoNotUploaded: "Logo not uploaded",
    signInFailed: "Couldn’t sign you in",
    accountCreated: "Account created",
    accountNotCreated: "Account not created",
    resetEmailSent: "Check your email",
    resetNotSent: "Email not sent",
    passwordNotChanged: "Password not changed",
    confirmationSent: "Confirmation email sent",
    confirmationNotSent: "Email not sent",
    amount: "Amount",
    balanceDue: "Balance due",
    keepOrder: "Keep order",
  },

  /** The app's navigation (plan §139.5). */
  nav: {
    main: "Main navigation",
    more: "More",
    secondary: "Secondary navigation",
    theme: "Theme",
    account: (name: string) => `Account: ${name}`,
  },

  /** The field kit (plan §139.5). */
  fields: {
    optional: "(Optional)",
    phonePrefix: "+91",
  },

  /** The quantity stepper (plan §139.5). */
  quantity: {
    decrease: "Decrease",
    increase: "Increase",
  },

  /** The range picker (plan §139.5). */
  range: {
    label: "Period",
    from: "From",
    to: "To",
  },

  /** How a stat tile says which way its figure moved (plan §139.5). */
  stats: {
    up: "Up",
    down: "Down",
    unchanged: "No change",
  },

  /** The words every chart shares (plan §139.11.11). */
  charts: {
    others: "Others",
    thisPeriod: "This period",
    previousPeriod: "Previous period",
    date: "Date",
    category: "Category",
    amount: "Amount",
    count: "Count",
    share: "Share",
    percent: (share: number) => `${share}%`,
    point: (label: string, value: string) => `${label}: ${value}`,
  },

  /** Moving an order along (plan §139.11.8). */
  orders: {
    overdue: "Overdue",
    cancelTitle: (orderNumber: string) => `Cancel order ${orderNumber}?`,
    cancelBody: "Its reserved stock goes back on the shelf. A cancelled order can’t be reopened.",
    cancelConfirm: "Cancel order",
  },

  /** Business details (plan §139.10, §139.11.2). */
  business: {
    title: "Business details",
    subtitle: "How your business appears in the app and on every bill",
    name: "Business name",
    tagline: "Catch phrase",
    taglinePlaceholder: "e.g. Your friendly home baker",
    city: "City",
    address: "Address",
    phone: "Business phone",
    phoneHint: "Printed on your bills. It can differ from the number you sign in with.",
    save: "Save details",
    logo: "Logo",
    logoHint: "PNG, JPG or WebP, up to 500 KB. It appears on your bills and at the top of the app.",
    uploadLogo: "Upload logo",
    replaceLogo: "Replace logo",
    currentLogo: "Your current logo",
    noLogo: "No logo yet",
    preview: "Bill header preview",
    previewNote: "This is how the top of your bills will read.",
    settingsRow: "Business details",
    settingsRowHint: "Name, address and logo",
  },

  /** The screens shown when a route is missing or a screen fails (plan §134 P0-2, P1-1). */
  system: {
    notFoundTitle: "This page isn’t here",
    notFoundBody: "The link may be out of date, or the address mistyped.",
    errorTitle: "Something went wrong",
    errorBody: "This screen stopped before it finished loading. Anything you had already saved is safe.",
    errorReference: (digest: string) => `Reference: ${digest}`,
    toDashboard: "Go to the dashboard",
  },
} as const;
