import type { Metadata } from "next";
import Link from "next/link";

import { UI_TEXT } from "@/constants/messages";
import { AUTH_ROUTES } from "@/constants/routes";
import { AuthCard } from "@/features/auth/components/AuthCard";
import { ForgotPasswordForm } from "@/features/auth/components/ForgotPasswordForm";

export const metadata: Metadata = {
  title: `${UI_TEXT.auth.forgotPassword} — ${UI_TEXT.appName}`,
};

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Forgot your password?"
      subtitle="We will email you a temporary password to sign in with."
      footer={
        <Link
          href={AUTH_ROUTES.signIn}
          className="font-bold text-primary transition-colors hover:text-primary-hover hover:underline"
        >
          {UI_TEXT.auth.backToSignIn}
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
