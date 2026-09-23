import type { Metadata } from "next";

import { UI_TEXT } from "@/constants/messages";
import { AuthCard } from "@/features/auth/components/AuthCard";
import { ChangePasswordForm } from "@/features/auth/components/ChangePasswordForm";

export const metadata: Metadata = {
  title: `${UI_TEXT.auth.setNewPassword} — ${UI_TEXT.appName}`,
};

export default function ChangePasswordPage() {
  return (
    <AuthCard
      title="Choose a new password"
      subtitle="This replaces the password you signed in with."
    >
      <ChangePasswordForm />
    </AuthCard>
  );
}
