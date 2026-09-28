import { act, render, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { SWRConfig, useSWRConfig } from "swr";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthSessionView } from "@/features/auth/types";

import { TEST_SESSION } from "@tests/support/auth";

const { fetcher, client, router } = vi.hoisted(() => ({
  fetcher: vi.fn(),
  client: { signIn: vi.fn(), signOut: vi.fn() },
  router: { replace: vi.fn(), push: vi.fn(), back: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() },
}));

// Signing in, out, or confirming an email loads a new page: nothing of the last account stays.
const { loadPage } = vi.hoisted(() => ({ loadPage: vi.fn() }));
vi.mock("@/lib/navigation/url", () => ({ loadPage }));
vi.mock("@/lib/api/client", () => ({ fetcher }));
vi.mock("@/features/auth/api.client", () => ({ AuthClient: client }));
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

const { AuthProvider, useAuth } = await import("@/features/auth/AuthProvider");

function arrivingWith(initial?: AuthSessionView | null) {
  return function wrapper({ children }: { children: ReactNode }) {
    return (
      <SWRConfig
        value={{ provider: () => new Map(), dedupingInterval: 0, shouldRetryOnError: false, onError: () => {} }}
      >
        <AuthProvider initial={initial}>{children}</AuthProvider>
      </SWRConfig>
    );
  };
}

const session = (initial?: AuthSessionView | null) => renderHook(() => useAuth(), { wrapper: arrivingWith(initial) });

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

describe("what the page arrived knowing", () => {
  it("is signed in at once when the server proved the session, and asks nothing", async () => {
    const { result } = session(TEST_SESSION);

    expect(result.current.status).toBe("authenticated");
    expect(result.current.profile?.name).toBe("Asha Baker");
    await new Promise((settle) => setTimeout(settle, 20));
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("is signed out at once for a visitor with no session, and never asks to be refused", async () => {
    const { result } = session(null);

    expect(result.current.status).toBe("anonymous");
    await new Promise((settle) => setTimeout(settle, 20));
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("asks when the server could not tell", async () => {
    fetcher.mockResolvedValue(TEST_SESSION);

    const { result } = session(undefined);

    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current.status).toBe("authenticated"));
  });

  it("stays signed out after signing out, rather than falling back to the session the page came with", async () => {
    const { result } = session(TEST_SESSION);

    await result.current.signOut();

    await waitFor(() => expect(result.current.status).toBe("anonymous"));
    expect(result.current.profile).toBeNull();
  });
});

describe("each account's reads", () => {
  it("are kept in a cache of their own, begun afresh when who is signed in changes", async () => {
    const caches: unknown[] = [];
    let auth: ReturnType<typeof useAuth> | undefined;
    function Probe() {
      caches.push(useSWRConfig().cache);
      auth = useAuth();
      return null;
    }
    const Wrapper = arrivingWith(TEST_SESSION);
    render(
      <Wrapper>
        <Probe />
      </Wrapper>,
    );
    const first = caches.at(-1);

    await act(() => auth!.adopt({ ...TEST_SESSION, profile: { ...TEST_SESSION.profile, id: "someone-else" } }));

    expect(auth!.profile?.id).toBe("someone-else");
    expect(caches.at(-1)).not.toBe(first);
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
    expect(loadPage).toHaveBeenCalledWith("/login");
  });

  it("clears what the device kept for the account — an order half built — but not the theme", async () => {
    fetcher.mockResolvedValue(TEST_SESSION);
    localStorage.setItem("brio_user:u-1:order_draft", "{}");
    localStorage.setItem("brio_theme", "peach");

    const { result } = session();
    await waitFor(() => expect(result.current.status).toBe("authenticated"));
    await result.current.signOut();

    expect(localStorage.getItem("brio_user:u-1:order_draft")).toBeNull();
    expect(localStorage.getItem("brio_theme")).toBe("peach");
    localStorage.clear();
  });

  it("forgets it even when the server could not be told", async () => {
    fetcher.mockResolvedValue(TEST_SESSION);
    client.signOut.mockRejectedValue(new TypeError("Network down"));

    const { result } = session();
    await waitFor(() => expect(result.current.status).toBe("authenticated"));

    await expect(result.current.signOut()).rejects.toThrow();

    await waitFor(() => expect(loadPage).toHaveBeenCalledWith("/login"));
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
