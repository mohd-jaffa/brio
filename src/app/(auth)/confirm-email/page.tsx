import type { Metadata } from "next";

import { UI_TEXT } from "@/constants/messages";
import { AuthScene } from "@/features/auth/components/AuthScene";
import { ConfirmEmailPanel } from "@/features/auth/components/ConfirmEmailPanel";

export const metadata: Metadata = {
  title: `${UI_TEXT.auth.confirmEmail} — ${UI_TEXT.appName}`,
};

export default function ConfirmEmailPage() {
  return (
    <AuthScene headline={UI_TEXT.auth.confirmHeadline} intro={UI_TEXT.auth.confirmIntro}>
      <ConfirmEmailPanel />
    </AuthScene>
  );
}
