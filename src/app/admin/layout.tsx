import type { ReactNode } from "react";

import { DevShell } from "@/features/admin/components/DevShell";
import { requireDeveloperScreen } from "@/features/auth/session.server";

/** The developer console (plan §37): DEV only, read-only. */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireDeveloperScreen();
  return <DevShell>{children}</DevShell>;
}
