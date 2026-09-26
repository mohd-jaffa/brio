import { AppShell } from "@/components/nav/AppShell";
import { Notifications } from "@/features/notifications/components/Notifications";

/** Notifications (plan §139.10, R5.10). */
export default function NotificationsPage() {
  return (
    <AppShell>
      <Notifications />
    </AppShell>
  );
}
