import { AppScreen } from "@/components/nav/AppScreen";
import { routeQuery } from "@/features/auth/session.server";
import { listNotificationsAfterDue } from "@/features/notifications/due";
import { Notifications } from "@/features/notifications/components/Notifications";
import { apiRoutes } from "@/lib/query/keys";
import { notificationListQuerySchema } from "@/lib/validation";

/** Notifications (plan §139.10, R5.10). */
export default function NotificationsPage() {
  return (
    <AppScreen
      pages={{
        [apiRoutes.notifications.list]: (tenant) =>
          listNotificationsAfterDue(tenant, routeQuery(apiRoutes.notifications.list, notificationListQuerySchema)),
      }}
    >
      <Notifications />
    </AppScreen>
  );
}
