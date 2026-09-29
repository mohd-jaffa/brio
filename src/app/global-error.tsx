"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SystemScreen } from "@/components/ui/system-screen";
import { UI_TEXT } from "@/constants/messages";
import { DEFAULT_THEME, THEME_BOOT_SCRIPT } from "@/lib/theme/themes";

import "./globals.css";

/**
 * The last line: the root layout itself failed. It replaces that layout, so it
 * brings its own document, styles and theme (plan §134 P0-2).
 */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en" data-theme={DEFAULT_THEME}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body>
        <title>{`${UI_TEXT.system.errorTitle} · ${UI_TEXT.appName}`}</title>
        <SystemScreen
          icon={TriangleAlert}
          title={UI_TEXT.system.errorTitle}
          body={UI_TEXT.system.errorBody}
          reference={error.digest ? UI_TEXT.system.errorReference(error.digest) : undefined}
        >
          <Button label={UI_TEXT.actions.retry} icon={RotateCcw} size="lg" fullWidth onClick={() => retry()} />
        </SystemScreen>
      </body>
    </html>
  );
}
