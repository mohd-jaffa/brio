import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { UI_TEXT } from "@/constants/messages";
import { AUTH_ROUTES } from "@/constants/routes";
import { AuthCard } from "@/features/auth/components/AuthCard";
import { AuthPending } from "@/features/auth/components/AuthPending";
import { RedirectWhenSignedIn } from "@/features/auth/components/RedirectWhenSignedIn";
import { RegisterForm } from "@/features/auth/components/RegisterForm";

export const metadata: Metadata = {
  title: `${UI_TEXT.auth.createAccount} — ${UI_TEXT.appName}`,
};

export default function RegisterPage() {
  return (
    <Suspense fallback={<AuthPending message={UI_TEXT.auth.checkingSession} />}>
      <RedirectWhenSignedIn>
        <AuthCard
          title="Start your bakery"
          subtitle="One account runs your orders, customers, stock and expenses."
          footer={
            <>
              {UI_TEXT.auth.haveAccount}{" "}
              <Link
                href={AUTH_ROUTES.signIn}
                className="font-bold text-primary transition-colors hover:text-primary-hover hover:underline"
              >
                {UI_TEXT.auth.signIn}
              </Link>
            </>
          }
        >
          <RegisterForm />
        </AuthCard>
      </RedirectWhenSignedIn>
    </Suspense>
  );
}
