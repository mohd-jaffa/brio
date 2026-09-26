"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";

import { Medallion } from "@/components/ui/medallion";
import { Row } from "@/components/ui/row";
import { UI_TEXT } from "@/constants/messages";

import { useAuth } from "../AuthProvider";

/**
 * **Sign out**, as the last row of the More sheet and of Settings (plan
 * §139.10). A second tap while it is on its way out does nothing.
 */
export function SignOutRow({ onSignedOut }: { onSignedOut?: () => void }) {
  const { signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const onClick = async () => {
    if (signingOut) return;
    setSigningOut(true);
    onSignedOut?.();
    await signOut();
  };

  return (
    <Row
      leading={<Medallion icon={LogOut} tone="neutral" size="sm" />}
      title={UI_TEXT.auth.signOut}
      subtitle={signingOut ? UI_TEXT.auth.signingOut : undefined}
      onClick={() => void onClick()}
    />
  );
}
