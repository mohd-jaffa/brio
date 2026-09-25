"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useSWRConfig } from "swr";

import { AUTH_ROUTES } from "@/constants/routes";
import { apiRoutes } from "@/lib/query/keys";
import { useApiQuery } from "@/lib/query/useApiQuery";
import { clearUserItems } from "@/lib/storage/userStorage";
import type { LoginInput } from "@/lib/validation";

import { AuthClient } from "./api.client";
import type { AuthProfile, AuthSessionView } from "./types";

/**
 * Who is signed in, for the whole app (plan §19). The session is read from the
 * server once and shared, so no screen asks again and no screen keeps its own
 * copy that can go stale; the tokens behind it stay in HttpOnly cookies and
 * never reach this file.
 */
export type AuthStatus = "loading" | "authenticated" | "anonymous";

interface AuthContextValue {
  status: AuthStatus;
  profile: AuthProfile | null;
  /** True while a temporary password is still in use (plan §95). */
  requiresPasswordChange: boolean;
  signIn: (credentials: LoginInput) => Promise<AuthSessionView>;
  signOut: () => Promise<void>;
  /** Re-reads the session — after a password change, or a confirmed email. */
  reload: () => Promise<void>;
  /** Adopts a session the caller has just been handed, without a second round trip. */
  adopt: (session: AuthSessionView) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { mutate: mutateAll } = useSWRConfig();

  // A signed-out visitor gets one 401 and no retries: it is the expected
  // answer here, not a failure worth hammering the server over.
  const session = useApiQuery<AuthSessionView>(apiRoutes.auth.session, {
    shouldRetryOnError: false,
  });

  const { data, error, isLoading, mutate } = session;

  const adopt = useCallback(
    async (view: AuthSessionView) => {
      await mutate(view, { revalidate: false });
    },
    [mutate],
  );

  const signIn = useCallback(
    async (credentials: LoginInput) => {
      const view = await AuthClient.signIn(credentials);
      await adopt(view);
      return view;
    },
    [adopt],
  );

  const signOut = useCallback(async () => {
    try {
      await AuthClient.signOut();
    } finally {
      // Whatever the server said, this browser is done: the cached rows belong
      // to the account that just left and must not be shown to the next one.
      await mutate(undefined, { revalidate: false });
      await mutateAll(() => true, undefined, { revalidate: false });
      // So is anything kept on the device for it — an order half built.
      clearUserItems();
      router.replace(AUTH_ROUTES.signIn);
    }
  }, [mutate, mutateAll, router]);

  const reload = useCallback(async () => {
    await mutate();
  }, [mutate]);

  const value = useMemo<AuthContextValue>(() => {
    const status: AuthStatus = data ? "authenticated" : isLoading && !error ? "loading" : "anonymous";

    return {
      status,
      profile: data?.profile ?? null,
      requiresPasswordChange: data?.requiresPasswordChange ?? false,
      signIn,
      signOut,
      reload,
      adopt,
    };
  }, [data, error, isLoading, signIn, signOut, reload, adopt]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside an AuthProvider.");
  return context;
}
