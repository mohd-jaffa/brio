"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { UI_TEXT } from "@/constants/messages";
import { AUTH_ROUTES, signInPath } from "@/constants/routes";

import { useAuth } from "../AuthProvider";
import { Pending } from "@/components/ui/pending";

/**
 * The gate every signed-in screen sits behind (plan §19). It sends a visitor
 * without a session to sign in, remembering where they were going, and sends a
 * baker still holding a temporary password to change it (§95).
 *
 * It is a convenience, not the control: the API refuses both cases on its own,
 * so a screen that slipped past this would still have nothing to show.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status, requiresPasswordChange } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const blocked = status === "anonymous" || requiresPasswordChange;

  useEffect(() => {
    if (status === "anonymous") {
      router.replace(signInPath(pathname));
    } else if (status === "authenticated" && requiresPasswordChange) {
      router.replace(AUTH_ROUTES.changePassword);
    }
  }, [status, requiresPasswordChange, pathname, router]);

  if (status === "loading" || blocked) {
    return <Pending message={UI_TEXT.auth.checkingSession} />;
  }

  return <>{children}</>;
}
