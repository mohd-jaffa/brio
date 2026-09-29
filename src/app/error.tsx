"use client";

import { Home, RotateCcw, TriangleAlert } from "lucide-react";

import { Button, LinkButton } from "@/components/ui/button";
import { SystemScreen } from "@/components/ui/system-screen";
import { UI_TEXT } from "@/constants/messages";
import { HOME_ROUTE } from "@/constants/routes";

/**
 * Catches a screen that fails while rendering, so it ends here rather than on
 * a blank page (plan §134 P0-2). The error's own message is never shown — in
 * production it is withheld anyway — only the digest the server logs carry.
 */
export default function ScreenError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <SystemScreen
      icon={TriangleAlert}
      title={UI_TEXT.system.errorTitle}
      body={UI_TEXT.system.errorBody}
      reference={error.digest ? UI_TEXT.system.errorReference(error.digest) : undefined}
    >
      <Button label={UI_TEXT.actions.retry} icon={RotateCcw} size="lg" fullWidth onClick={() => retry()} />
      <LinkButton
        href={HOME_ROUTE}
        label={UI_TEXT.system.toDashboard}
        icon={Home}
        variant="ghost"
        size="lg"
        fullWidth
      />
    </SystemScreen>
  );
}
