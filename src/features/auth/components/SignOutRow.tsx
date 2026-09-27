"use client";

import { LogOut } from "lucide-react";

import { Medallion } from "@/components/ui/medallion";
import { Row } from "@/components/ui/row";
import { UI_TEXT } from "@/constants/messages";

import { useSignOut } from "../hooks/useSignOut";

/**
 * **Sign out**, as the last row of the More sheet and of Settings (plan
 * §139.10). It asks first (`useSignOut`); a second tap while it is on its way
 * out does nothing.
 */
export function SignOutRow({ onSignedOut }: { onSignedOut?: () => void }) {
  const { signingOut, signOut } = useSignOut(onSignedOut);

  return (
    <Row
      leading={<Medallion icon={LogOut} tone="neutral" size="sm" />}
      title={UI_TEXT.auth.signOut}
      subtitle={signingOut ? UI_TEXT.auth.signingOut : undefined}
      onClick={() => void signOut()}
    />
  );
}
