import type { Metadata } from "next";

import { AppScreen } from "@/components/nav/AppScreen";
import { UI_TEXT } from "@/constants/messages";
import { DeleteAccount } from "@/features/auth/components/DeleteAccount";

export const metadata: Metadata = {
  title: `${UI_TEXT.deleteAccount.title} — ${UI_TEXT.appName}`,
};

/** Deleting the account (plan §139.17.5, R8.10), from Settings; the privacy policy links here for the web. */
export default function DeleteAccountPage() {
  return (
    <AppScreen>
      <DeleteAccount />
    </AppScreen>
  );
}
