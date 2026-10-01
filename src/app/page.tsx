import type { Metadata } from "next";

import { Landing } from "@/components/landing/Landing";
import { UI_TEXT } from "@/constants/messages";
import { readInitialSession } from "@/features/auth/session.server";
import { LANDING_ROUTE } from "@/constants/routes";
import { shareMetadata } from "@/lib/share/metadata";

export const metadata: Metadata = {
  title: UI_TEXT.appTitle,
  description: UI_TEXT.landing.metaDescription,
  alternates: { canonical: LANDING_ROUTE },
  ...shareMetadata(UI_TEXT.landing.metaDescription, LANDING_ROUTE),
};

/**
 * The landing page, at the site's root (plan §139.11.22; the user,
 * 2026-10-01: "make / route for landing page, give /home for homepage"): open
 * to anyone, signed in or not, so the proxy does not run for it, as for the
 * privacy policy. Someone signed in is offered the way back into the app
 * (Home, at `/home`) instead of making an account. `/about`, where it was
 * first, leads here (next.config.ts).
 */
export default async function LandingPage() {
  const signedIn = Boolean(await readInitialSession());
  return <Landing signedIn={signedIn} year={new Date().getFullYear()} />;
}
