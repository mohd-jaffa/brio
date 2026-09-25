import { ERROR_MESSAGES, type ErrorMessageCode } from "@/constants/messages";

/**
 * How the browser talks to the API. One place unwraps the success envelope,
 * turns a failure envelope back into an error carrying the server's own
 * wording, and sets the headers — so a feature's client module is a list of
 * endpoints and nothing else (AGENTS.md §24).
 *
 * Nothing here attaches a token: the session lives in HttpOnly cookies that
 * the browser sends on its own (src/features/auth/cookies.ts). What this does
 * own is the one thing every caller would otherwise repeat — when a request is
 * refused because the access token has expired, the session is refreshed once
 * and the request is sent again, so an hour of work does not end in an error.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorMessageCode | "UNKNOWN_ERROR",
    message: string,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
  error?: { code?: ErrorMessageCode; message?: string; requestId?: string };
}

const REFRESH_ROUTE = "/api/auth/refresh";

/** The routes that establish or end a session; retrying one of them is nonsense. */
const NEVER_RETRIED = [REFRESH_ROUTE, "/api/auth/login", "/api/auth/logout", "/api/auth/confirm"];

/**
 * At most one refresh is in flight. Several screens load at once, and without
 * this a single expiry would send one refresh per request — each rotating the
 * refresh token out from under the others.
 */
let refreshInFlight: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  refreshInFlight ??= fetch(REFRESH_ROUTE, { method: "POST" })
    .then((response) => response.ok)
    .catch(() => false)
    .finally(() => {
      refreshInFlight = null;
    });

  return refreshInFlight;
}

/** Only for tests: forgets an in-flight refresh between cases. */
export function resetSessionRefresh() {
  refreshInFlight = null;
}

export async function fetcher<T>(url: string, init?: RequestInit): Promise<T> {
  const attempt = () =>
    fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });

  let response = await attempt();

  if (response.status === 401 && !NEVER_RETRIED.some((route) => url.startsWith(route))) {
    if (await refreshSession()) response = await attempt();
  }

  const body = (await response.json().catch(() => ({}))) as ApiEnvelope<T>;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      body.error?.code ?? "UNKNOWN_ERROR",
      body.error?.message ?? ERROR_MESSAGES.INTERNAL_ERROR,
      body.error?.requestId,
    );
  }

  return body.data as T;
}

const send = <T>(method: string) =>
  (url: string, payload?: unknown): Promise<T> =>
    fetcher<T>(url, { method, body: payload === undefined ? undefined : JSON.stringify(payload) });

export const getJson = <T>(url: string) => fetcher<T>(url);
export const postJson = <T>(url: string, payload?: unknown) => send<T>("POST")(url, payload);
export const patchJson = <T>(url: string, payload?: unknown) => send<T>("PATCH")(url, payload);
export const deleteJson = <T>(url: string) => send<T>("DELETE")(url);

/** A file as the whole body, with its own type: the logo upload (plan §56). */
export const postFile = <T>(url: string, file: Blob) =>
  fetcher<T>(url, {
    method: "POST",
    body: file,
    headers: { "Content-Type": file.type || "application/octet-stream" },
  });
