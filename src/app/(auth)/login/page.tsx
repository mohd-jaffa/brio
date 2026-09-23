import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { UI_TEXT } from "@/constants/messages";
import { AUTH_ROUTES } from "@/constants/routes";
import { AuthCard } from "@/features/auth/components/AuthCard";
import { AuthPending } from "@/features/auth/components/AuthPending";
import { RedirectWhenSignedIn } from "@/features/auth/components/RedirectWhenSignedIn";
import { SignInForm } from "@/features/auth/components/SignInForm";

export const metadata: Metadata = {
  title: `${UI_TEXT.auth.signIn} — ${UI_TEXT.appName}`,
};

export default function SignInPage() {
  return (
    <Suspense fallback={<AuthPending message={UI_TEXT.auth.checkingSession} />}>
      <RedirectWhenSignedIn>
        <AuthCard
          title="Welcome back"
          subtitle="Sign in to manage your orders, stock and bills."
          footer={
            <>
              {UI_TEXT.auth.noAccount}{" "}
              <Link
                href={AUTH_ROUTES.register}
                className="font-bold text-primary transition-colors hover:text-primary-hover hover:underline"
              >
                {UI_TEXT.auth.createAccount}
              </Link>
            </>
          }
        >
          <SignInForm />
        </AuthCard>
      </RedirectWhenSignedIn>
    </Suspense>
  );
}
