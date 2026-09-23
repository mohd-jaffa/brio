"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { UI_TEXT } from "@/constants/messages";
import { AUTH_ROUTES, RETURN_TO_PARAM, returnToPath } from "@/constants/routes";

import { useAuth } from "../AuthProvider";
import { AuthPending } from "./AuthPending";

/**
 * The other half of the gate: someone already signed in has no use for the
 * sign-in or register screen, so they are sent on — to the screen that sent
 * them here, or to change their temporary password if one is still in use.
 */
export function RedirectWhenSignedIn({ children }: { children: ReactNode }) {
  const { status, requiresPasswordChange } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const signedIn = status === "authenticated";

  useEffect(() => {
    if (!signedIn) return;
    router.replace(
      requiresPasswordChange
        ? AUTH_ROUTES.changePassword
        : returnToPath(searchParams.get(RETURN_TO_PARAM)),
    );
  }, [signedIn, requiresPasswordChange, router, searchParams]);

  if (signedIn) return <AuthPending message={UI_TEXT.auth.checkingSession} />;

  return <>{children}</>;
}
