import type { Metadata } from "next";
import { Suspense } from "react";

import { UI_TEXT } from "@/constants/messages";
import { AUTH_ROUTES } from "@/constants/routes";
import { AuthPending } from "@/features/auth/components/AuthPending";
import { AuthScene } from "@/features/auth/components/AuthScene";
import { RedirectWhenSignedIn } from "@/features/auth/components/RedirectWhenSignedIn";
import { RegisterForm } from "@/features/auth/components/RegisterForm";

export const metadata: Metadata = {
  title: `${UI_TEXT.auth.createAccount} — ${UI_TEXT.appName}`,
};

export default function RegisterPage() {
  return (
    <Suspense fallback={<AuthPending message={UI_TEXT.auth.checkingSession} />}>
      <RedirectWhenSignedIn>
        <AuthScene
          headline={UI_TEXT.auth.registerHeadline}
          intro={UI_TEXT.auth.registerIntro}
          backHref={AUTH_ROUTES.signIn}
          counterpart={{
            question: UI_TEXT.auth.haveAccount,
            label: UI_TEXT.auth.signIn,
            href: AUTH_ROUTES.signIn,
          }}
        >
          <RegisterForm />
        </AuthScene>
      </RedirectWhenSignedIn>
    </Suspense>
  );
}
