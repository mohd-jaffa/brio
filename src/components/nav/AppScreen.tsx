import type { ReactNode } from "react";

import { readScreen, type ScreenRead } from "@/features/auth/session.server";
import { getBusiness } from "@/features/business/api";
import { countUnreadAfterDue } from "@/features/notifications/due";
import { apiRoutes } from "@/lib/query/keys";
import { ServerData } from "@/lib/query/ServerData";

import { AppShell } from "./AppShell";

/** What every signed-in screen's frame shows: the business's name and mark, and the bell's count. */
const SHELL_READS: Record<string, ScreenRead> = {
  [apiRoutes.business.profile]: getBusiness,
  [apiRoutes.notifications.unread]: countUnreadAfterDue,
};

/**
 * A signed-in screen, drawn on the server with its first data (plan §139.9):
 * the frame's own reads and the screen's `queries` and `pages`, keyed as the
 * screen's hooks ask for them, so the page arrives ready to read rather than
 * as placeholders that fill in after it (`readScreen`, `ServerData`).
 */
export async function AppScreen({
  queries,
  pages,
  children,
}: {
  queries?: Record<string, ScreenRead>;
  pages?: Record<string, ScreenRead>;
  children: ReactNode;
}) {
  const data = await readScreen({ queries: { ...SHELL_READS, ...queries }, pages });
  return (
    <ServerData queries={data.queries} pages={data.pages}>
      <AppShell>{children}</AppShell>
    </ServerData>
  );
}
