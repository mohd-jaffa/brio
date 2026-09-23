import type { Metadata } from "next";

import { UI_TEXT } from "@/constants/messages";
import { AuthCard } from "@/features/auth/components/AuthCard";
import { ConfirmEmailPanel } from "@/features/auth/components/ConfirmEmailPanel";

export const metadata: Metadata = {
  title: `Confirm your email — ${UI_TEXT.appName}`,
};

export default function ConfirmEmailPage() {
  return (
    <AuthCard title="Confirming your email" subtitle="This only takes a moment.">
      <ConfirmEmailPanel />
    </AuthCard>
  );
}
