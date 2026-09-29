import type { Metadata } from "next";

import { UI_TEXT } from "@/constants/messages";
import { AuthScene } from "@/features/auth/components/AuthScene";
import { ChangePasswordForm } from "@/features/auth/components/ChangePasswordForm";

export const metadata: Metadata = {
  title: `${UI_TEXT.auth.setNewPassword} — ${UI_TEXT.appName}`,
};

/**
 * No way back and no other door: a baker holding a temporary password cannot
 * reach any other screen until this one is done (plan §95), so the scene is
 * given neither a back link nor a counterpart.
 */
export default function ChangePasswordPage() {
  return (
    <AuthScene headline={UI_TEXT.auth.changePasswordHeadline} intro={UI_TEXT.auth.changePasswordIntro}>
      <ChangePasswordForm />
    </AuthScene>
  );
}
