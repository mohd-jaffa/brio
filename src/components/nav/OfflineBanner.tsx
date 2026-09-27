"use client";

import { WifiOff } from "lucide-react";
import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { UI_TEXT } from "@/constants/messages";

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

/**
 * The connection dropped (plan IMP-08, §139.19 R7.2): a quiet bar over the
 * screen saying so — what is shown may be out of date — and **Try again**,
 * which loads the screen afresh. It goes by itself when the connection comes
 * back. The server always draws it hidden: it cannot know.
 */
export function OfflineBanner() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  if (online) return null;
  return (
    <div
      role="status"
      className="animate-drop-in flex items-center gap-3 rounded-2xl border border-warning/30 bg-warning-bg px-4 py-3 text-sm text-text"
    >
      <WifiOff size={18} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-warning" />
      <p className="min-w-0 flex-1">{UI_TEXT.offline.banner}</p>
      <Button label={UI_TEXT.offline.retry} variant="secondary" size="sm" onClick={() => window.location.reload()} />
    </div>
  );
}
