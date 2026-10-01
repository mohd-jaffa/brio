import type { Metadata } from "next";

import { Landing } from "@/components/landing/Landing";
import { UI_TEXT } from "@/constants/messages";
import { readInitialSession } from "@/features/auth/session.server";

export const metadata: Metadata = {
  title: UI_TEXT.appTitle,
  description: UI_TEXT.landing.metaDescription,
};

/**
 * The landing page (plan §139.11.22): open to anyone, signed in or not, so
 * the proxy does not run for it, as for the privacy policy. Someone signed in
 * is offered the way back into the app instead of making an account.
 */
export default async function AboutPage() {
  const signedIn = Boolean(await readInitialSession());
  return <Landing signedIn={signedIn} year={new Date().getFullYear()} />;
}
