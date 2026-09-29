"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { SWRConfig, useSWRConfig } from "swr";

import { accountDeletedPath, AUTH_ROUTES } from "@/constants/routes";
import { apiRoutes } from "@/lib/query/keys";
import { useApiQuery } from "@/lib/query/useApiQuery";
import { clearUserItems } from "@/lib/storage/userStorage";
import type { DeleteAccountInput, LoginInput } from "@/lib/validation";
import { loadPage } from "@/lib/navigation/url";

import { AuthClient } from "./api.client";
import type { AuthProfile, AuthSessionView } from "./types";

/**
 * Who is signed in, for the whole app (plan §19). The session is read from the
 * server once and shared, so no screen asks again and no screen keeps its own
 * copy that can go stale; the tokens behind it stay in HttpOnly cookies and
 * never reach this file.
 *
 * The page arrives knowing it where it can (`readInitialSession`): signed in,
 * the screen is drawn at once, without a round trip first; signed out, nothing
 * is asked, so a visitor on the sign-in screen is not answered with a refusal.
 * Only a session the server could not settle is read from here.
 */
export type AuthStatus = "loading" | "authenticated" | "anonymous";

interface AuthContextValue {
  status: AuthStatus;
  profile: AuthProfile | null;
  /** True while a temporary password is still in use (plan §95). */
  requiresPasswordChange: boolean;
  signIn: (credentials: LoginInput) => Promise<AuthSessionView>;
  signOut: () => Promise<void>;
  /**
   * Deletes the account and everything of its business, for good (R8.10),
   * then leaves as signing out does. A refusal — a mistyped password — is
   * thrown to the caller, and nothing is forgotten.
   */
  deleteAccount: (confirmation: DeleteAccountInput) => Promise<void>;
  /** Re-reads the session — after a password change, or a confirmed email. */
  reload: () => Promise<void>;
  /** Adopts a session the caller has just been handed, without a second round trip. */
  adopt: (session: AuthSessionView) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type InitialSession = AuthSessionView | null | undefined;

export function AuthProvider({
  initial,
  children,
}: {
  /** What the server knew: the session, null for signed out, or undefined when it could not tell. */
  initial?: InitialSession;
  children: ReactNode;
}) {
  const { mutate: mutateAll, cache } = useSWRConfig();
  // The answer as it stands: a session is looked at again when the owner
  // comes back to the app; nobody's is not.
  const cached = cache.get(apiRoutes.auth.session)?.data as InitialSession;
  const signedIn = Boolean(cached === undefined ? initial : cached);

  // A refusal gets no retries: it is the expected answer for a visitor with an
  // expired session, not a failure worth hammering the server over.
  const session = useApiQuery<AuthSessionView | null>(apiRoutes.auth.session, {
    shouldRetryOnError: false,
    fallbackData: initial,
    revalidateOnMount: initial === undefined,
    revalidateOnFocus: signedIn,
    revalidateOnReconnect: signedIn,
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

  /** This browser done with the account: nothing of it kept, and a new page at `url`. */
  const leave = useCallback(
    async (url: string) => {
      // The cached rows belong to the account that just left and must not be
      // shown to the next one.
      await mutateAll(() => true, undefined, { revalidate: false });
      // Nobody, said outright and last: an emptied session would fall back to
      // the one the page arrived with.
      await mutate(null, { revalidate: false });
      // So is anything kept on the device for it — an order half built.
      clearUserItems();
      // And a new page, so nothing else of it stays in memory either.
      loadPage(url);
    },
    [mutate, mutateAll],
  );

  const signOut = useCallback(async () => {
    try {
      await AuthClient.signOut();
    } finally {
      // Whatever the server said, this browser is done.
      await leave(AUTH_ROUTES.signIn);
    }
  }, [leave]);

  const deleteAccount = useCallback(
    async (confirmation: DeleteAccountInput) => {
      await AuthClient.deleteAccount(confirmation);
      await leave(accountDeletedPath());
    },
    [leave],
  );

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
      deleteAccount,
      reload,
      adopt,
    };
  }, [data, error, isLoading, signIn, signOut, deleteAccount, reload, adopt]);

  return (
    <AuthContext.Provider value={value}>
      {/* Each account's reads in a cache of their own, begun afresh whenever
          who is signed in changes: one account's rows can never be shown to
          the next, whatever path the change took. */}
      <SWRConfig key={value.profile?.id ?? SIGNED_OUT} value={ACCOUNT_CACHE}>
        {children}
      </SWRConfig>
    </AuthContext.Provider>
  );
}

const SIGNED_OUT = "signed-out";
const ACCOUNT_CACHE = { provider: () => new Map() };

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside an AuthProvider.");
  return context;
}
