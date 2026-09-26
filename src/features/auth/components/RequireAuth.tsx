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
 * While the session is being checked, the screen mounts out of sight: hidden,
 * so nothing of it shows, takes focus or reaches a screen reader, but it asks
 * for its data at the same moment as the session rather than a round trip
 * after it. Once the session is known the same element simply shows, so the
 * screen is not mounted twice. A visitor who turns out to have no session, or
 * to owe a password change, never sees it: it goes as they are sent on.
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

  if (blocked) return <Pending message={UI_TEXT.auth.checkingSession} />;

  const checking = status === "loading";
  return (
    <>
      {checking && <Pending message={UI_TEXT.auth.checkingSession} />}
      {/* `contents` once shown, so the wrapper adds nothing to the layout; the
          element stays the same either way, so the screen is kept. */}
      <div hidden={checking} className={checking ? undefined : "contents"}>
        {children}
      </div>
    </>
  );
}
