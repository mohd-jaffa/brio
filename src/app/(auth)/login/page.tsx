import type { Metadata } from "next";
import { Suspense } from "react";

import { UI_TEXT } from "@/constants/messages";
import { AUTH_ROUTES } from "@/constants/routes";
import { Pending } from "@/components/ui/pending";
import { AuthPromise, AuthScene } from "@/features/auth/components/AuthScene";
import { RedirectWhenSignedIn } from "@/features/auth/components/RedirectWhenSignedIn";
import { SignInForm } from "@/features/auth/components/SignInForm";

export const metadata: Metadata = {
  title: `${UI_TEXT.auth.signIn} — ${UI_TEXT.appName}`,
};

export default function SignInPage() {
  return (
    <Suspense fallback={<Pending message={UI_TEXT.auth.checkingSession} />}>
      <RedirectWhenSignedIn>
        <AuthScene
          headline={UI_TEXT.auth.signInHeadline}
          intro={UI_TEXT.auth.signInIntro}
          counterpart={{
            question: UI_TEXT.auth.noAccount,
            label: UI_TEXT.auth.createAccount,
            href: AUTH_ROUTES.register,
          }}
          footer={<AuthPromise>{UI_TEXT.auth.promise}</AuthPromise>}
        >
          <SignInForm />
        </AuthScene>
      </RedirectWhenSignedIn>
    </Suspense>
  );
}
