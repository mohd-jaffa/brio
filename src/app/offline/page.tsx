import { WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SystemScreen } from "@/components/ui/system-screen";
import { UI_TEXT } from "@/constants/messages";

/**
 * What the installed app shows when a screen cannot be reached (plan §139.19
 * R7.2): the service worker keeps this page, fetched with no session, and
 * answers with it when the network does not. **Try again** is a plain form
 * that asks for the same address again, so it works even before any script
 * has loaded.
 */
export default function OfflinePage() {
  return (
    <SystemScreen icon={WifiOff} title={UI_TEXT.offline.title} body={UI_TEXT.offline.body}>
      <form method="get">
        <Button type="submit" label={UI_TEXT.offline.retry} size="lg" fullWidth />
      </form>
    </SystemScreen>
  );
}
