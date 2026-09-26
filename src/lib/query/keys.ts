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
  },
  customers: {
    list: "/api/customers",
    detail: (id: string) => `/api/customers/${id}`,
  },
  products: {
    list: "/api/products",
    detail: (id: string) => `/api/products/${id}`,
  },
  orders: {
    list: "/api/orders",
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
    detail: (id: string) => `/api/expenses/${id}`,
  },
  analytics: {
    overview: "/api/analytics/overview",
  },
  business: {
    profile: "/api/business",
    logo: "/api/business/logo",
  },
} as const;
