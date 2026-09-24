import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { SWRConfig } from "swr";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TEST_SESSION } from "@tests/support/auth";

const { fetcher, client, router } = vi.hoisted(() => ({
  fetcher: vi.fn(),
  client: { signIn: vi.fn(), signOut: vi.fn() },
  router: { replace: vi.fn(), push: vi.fn(), back: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() },
}));

vi.mock("@/lib/api/client", () => ({ fetcher }));
vi.mock("@/features/auth/api.client", () => ({ AuthClient: client }));
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

const { AuthProvider, useAuth } = await import("@/features/auth/AuthProvider");

function wrapper({ children }: { children: ReactNode }) {
  return (
    <SWRConfig
      value={{ provider: () => new Map(), dedupingInterval: 0, shouldRetryOnError: false, onError: () => {} }}
    >
      <AuthProvider>{children}</AuthProvider>
    </SWRConfig>
  );
}

const session = () => renderHook(() => useAuth(), { wrapper });

beforeEach(() => {
  vi.clearAllMocks();
  fetcher.mockReset();
  fetcher.mockResolvedValue(undefined);
  client.signOut.mockResolvedValue({ signedOut: true });
});

describe("who is signed in", () => {
  it("waits before deciding, rather than reporting nobody", () => {
    fetcher.mockImplementation(() => new Promise(() => {}));

    expect(session().result.current.status).toBe("loading");
  });

  it("reads the session from the server once, for the whole app", async () => {
    fetcher.mockResolvedValue(TEST_SESSION);

    const { result } = session();

    await waitFor(() => expect(result.current.status).toBe("authenticated"));
    expect(result.current.profile?.name).toBe("Asha Baker");
    expect(fetcher).toHaveBeenCalledWith("/api/auth/session");
  });

  it("treats a refused session as nobody being signed in", async () => {
    fetcher.mockRejectedValue(new Error("401"));

    const { result } = session();

    await waitFor(() => expect(result.current.status).toBe("anonymous"));
    expect(result.current.profile).toBeNull();
  });

  it("carries the forced password change through to the screens", async () => {
    fetcher.mockResolvedValue({ ...TEST_SESSION, requiresPasswordChange: true });

    const { result } = session();

    await waitFor(() => expect(result.current.requiresPasswordChange).toBe(true));
  });
});

describe("signing in and out", () => {
  it("adopts the session the sign-in returned without asking the server again", async () => {
    fetcher.mockRejectedValue(new Error("401"));
    client.signIn.mockResolvedValue(TEST_SESSION);

    const { result } = session();
    await waitFor(() => expect(result.current.status).toBe("anonymous"));

    await result.current.signIn({ phone: "+919876543210", password: "hunter22" });

    await waitFor(() => expect(result.current.status).toBe("authenticated"));
    expect(client.signIn).toHaveBeenCalledWith({ phone: "+919876543210", password: "hunter22" });
  });

  it("forgets the session and sends the browser to sign-in", async () => {
    fetcher.mockResolvedValue(TEST_SESSION);

    const { result } = session();
    await waitFor(() => expect(result.current.status).toBe("authenticated"));

    await result.current.signOut();

    await waitFor(() => expect(result.current.status).toBe("anonymous"));
    expect(router.replace).toHaveBeenCalledWith("/login");
  });

  it("forgets it even when the server could not be told", async () => {
    fetcher.mockResolvedValue(TEST_SESSION);
    client.signOut.mockRejectedValue(new TypeError("Network down"));

    const { result } = session();
    await waitFor(() => expect(result.current.status).toBe("authenticated"));

    await expect(result.current.signOut()).rejects.toThrow();

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login"));
  });

  it("re-reads the session when asked", async () => {
    fetcher.mockResolvedValue(TEST_SESSION);

    const { result } = session();
    await waitFor(() => expect(result.current.status).toBe("authenticated"));

    fetcher.mockClear();
    await result.current.reload();

    expect(fetcher).toHaveBeenCalledWith("/api/auth/session");
  });

  it("refuses to be used without a provider, rather than reporting nobody is signed in", () => {
    expect(() => renderHook(() => useAuth())).toThrow(/AuthProvider/);
  });
});
