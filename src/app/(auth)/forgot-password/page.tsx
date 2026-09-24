import type { Metadata } from "next";

import { UI_TEXT } from "@/constants/messages";
import { AUTH_ROUTES } from "@/constants/routes";
import { AuthScene } from "@/features/auth/components/AuthScene";
import { ForgotPasswordForm } from "@/features/auth/components/ForgotPasswordForm";

export const metadata: Metadata = {
  title: `${UI_TEXT.auth.forgotPassword} — ${UI_TEXT.appName}`,
};

export default function ForgotPasswordPage() {
  return (
    <AuthScene
      headline={UI_TEXT.auth.forgotHeadline}
      intro={UI_TEXT.auth.forgotIntro}
      backHref={AUTH_ROUTES.signIn}
    >
      <ForgotPasswordForm />
    </AuthScene>
  );
}
