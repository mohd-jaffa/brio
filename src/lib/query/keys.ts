/**
 * Every endpoint the browser calls, in one place. A screen names a route
 * through here, and the hook that refreshes after a change names the same one,
 * so a mutation cannot revalidate a key no query used — the way an inline
 * string quietly can. These double as SWR's cache keys.
 */
export const apiRoutes = {
  auth: {
    session: "/api/auth/session",
    login: "/api/auth/login",
    logout: "/api/auth/logout",
    register: "/api/auth/register",
    password: "/api/auth/password",
    passwordReset: "/api/auth/password-reset",
    refresh: "/api/auth/refresh",
    confirm: "/api/auth/confirm",
    resendConfirmation: "/api/auth/resend-confirmation",
    name: "/api/auth/name",
    avatar: "/api/auth/avatar",
    welcome: "/api/auth/welcome",
    phone: "/api/auth/phone",
    email: "/api/auth/email",
    emailResend: "/api/auth/email/resend",
    emailConfirm: "/api/auth/email/confirm",
    account: "/api/auth/account",
  },
  customers: {
    list: "/api/customers",
    detail: (id: string) => `/api/customers/${id}`,
    summary: (id: string) => `/api/customers/${id}/summary`,
  },
  guestSales: "/api/guest-sales",
  expenseCategories: {
    list: "/api/expense-categories",
    detail: (category: string) => `/api/expense-categories/${encodeURIComponent(category)}`,
  },
  products: {
    list: "/api/products",
    detail: (id: string) => `/api/products/${id}`,
  },
  orders: {
    list: "/api/orders",
    counts: "/api/orders/counts",
    preview: "/api/orders/preview",
    detail: (id: string) => `/api/orders/${id}`,
    payments: (id: string) => `/api/orders/${id}/payments`,
    bill: (id: string) => `/api/orders/${id}/bill`,
    billPdf: (id: string) => `/api/orders/${id}/bill.pdf`,
  },
  inventory: {
    transactions: "/api/inventory",
    balances: (productIds?: readonly string[]) =>
      productIds && productIds.length > 0
        ? `/api/inventory/balance?products=${productIds.join(",")}`
        : "/api/inventory/balance",
  },
  expenses: {
    list: "/api/expenses",
    summary: "/api/expenses/summary",
    detail: (id: string) => `/api/expenses/${id}`,
  },
  analytics: {
    overview: "/api/analytics/overview",
  },
  dashboard: "/api/dashboard",
  notifications: {
    list: "/api/notifications",
    unread: "/api/notifications/unread",
    readAll: "/api/notifications/read-all",
    read: (id: string) => `/api/notifications/${id}/read`,
    /** What the Android app sets as reminders (R8.6). */
    reminders: "/api/notifications/reminders",
    /** A browser that wants the order reminders pushed to it (R8.6). */
    devices: "/api/notifications/devices",
  },
  business: {
    profile: "/api/business",
    logo: "/api/business/logo",
  },
  /** The developer console (plan §37): read-only, DEV only. */
  admin: {
    overview: "/api/admin/overview",
    users: "/api/admin/users",
    audit: "/api/admin/audit",
  },
} as const;

/**
 * A route with its query: the values given, in the order given, and nothing
 * for one left empty — so a list with no search asks for exactly its route,
 * and shares its cache with every other screen that does.
 */
export function withQuery(route: string, params: Record<string, string | null | undefined>): string {
  const query = new URLSearchParams();
  for (const [name, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") query.set(name, value);
  }
  const text = query.toString();
  if (text === "") return route;
  return `${route}${route.includes("?") ? "&" : "?"}${text}`;
}
