export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function fetcher<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(
      res.status,
      body.error?.code || "UNKNOWN_ERROR",
      body.error?.message || "An unknown error occurred"
    );
  }

  return body.data as T;
}
