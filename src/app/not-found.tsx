"use client";

import { Compass, Home } from "lucide-react";

import { LinkButton } from "@/components/ui/button";
import { SystemScreen } from "@/components/ui/system-screen";
import { UI_TEXT } from "@/constants/messages";
import { HOME_ROUTE } from "@/constants/routes";

/**
 * Any address the app does not have, and any `notFound()` (plan §134 P1-1).
 * A Client Component because it hands an icon component to the button, and a
 * function cannot cross from the server to the client.
 */
export default function NotFound() {
  return (
    <SystemScreen icon={Compass} title={UI_TEXT.system.notFoundTitle} body={UI_TEXT.system.notFoundBody}>
      <LinkButton href={HOME_ROUTE} label={UI_TEXT.system.toDashboard} icon={Home} size="lg" fullWidth />
    </SystemScreen>
  );
}
