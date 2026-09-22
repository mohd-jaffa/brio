import { ERROR_MESSAGES, type ErrorMessageCode } from "@/constants/messages";

/**
 * How the browser talks to the API. One place unwraps the success envelope,
 * turns a failure envelope back into an error carrying the server's own
 * wording, and sets the headers — so a feature's client module is a list of
 * endpoints and nothing else (AGENTS.md §24).
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

export async function fetcher<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

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
