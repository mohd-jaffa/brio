"use client";

import { CheckCheck } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ListScreen } from "@/components/ui/list-screen";
import { PageHeader } from "@/components/ui/page-header";
import { useResponse } from "@/components/ui/response-card";
import { RowList } from "@/components/ui/row";
import { TabPanel, Tabs } from "@/components/ui/tabs";
import { UI_TEXT } from "@/constants/messages";
import { NOTIFICATION_TABS, type NotificationTab } from "@/constants/statuses";
import { apiRoutes, withQuery } from "@/lib/query/keys";
import { useApiMutation } from "@/lib/query/useApiMutation";
import { useApiPages } from "@/lib/query/useApiPages";

import { NotificationsClient } from "../api.client";
import { useUnreadNotifications } from "../hooks/useUnreadNotifications";
import type { AppNotification } from "../types";
import { NotificationRow } from "./NotificationRow";

const text = UI_TEXT.notifications;

/** What a change to the inbox makes stale: every tab's pages, and the bell. */
const INBOX = [apiRoutes.notifications.list, apiRoutes.notifications.unread] as const;

/**
 * One tab's notifications, newest first and a page at a time. Opening one
 * marks it read on the way; should that fail, it simply stays unread — the
 * owner has gone where it led, and a card about it would only be in the way.
 */
function NotificationList({ tab }: { tab: NotificationTab }) {
  const pages = useApiPages<AppNotification>(
    withQuery(apiRoutes.notifications.list, { tab: tab === "ALL" ? null : tab }),
  );
  const { submit: markRead } = useApiMutation(NotificationsClient.markRead, { revalidate: INBOX });

  return (
    <ListScreen
      query={pages}
      loadFailed="NOTIFICATIONS_LOAD_FAILED"
      data={pages.data}
      noMatches={tab === "ALL" ? undefined : text.noneInTab[tab]}
      empty={<EmptyState art="bell" title={text.emptyTitle} hint={text.emptyHint} />}
      renderList={(items) => (
        <RowList label={text.tabNames[tab]}>
          {items.map((notification) => (
            <NotificationRow key={notification.id} notification={notification} onRead={(read) => markRead(read.id)} />
          ))}
        </RowList>
      )}
    />
  );
}

/**
 * Notifications (plan §139.10): what happened in the business — orders
 * placed and moved, payments, low stock, new customers — newest first, by
 * tab, with **Mark all as read**. The worker writes them (0022); the bell in
 * the top bar shows whether any wait.
 */
export function Notifications() {
  const [tab, setTab] = useState<NotificationTab>("ALL");
  const unread = useUnreadNotifications();
  const respond = useResponse();
  const { submit: markAllRead, submitting } = useApiMutation(NotificationsClient.markAllRead, {
    revalidate: INBOX,
    onError: (failure) =>
      respond.failure(failure, { title: UI_TEXT.outcomes.notificationsNotRead, fallback: "NOTIFICATIONS_READ_FAILED" }),
  });

  return (
    <div className="space-y-6">
      <PageHeader title={text.title} subtitle={text.subtitle}>
        <Button
          label={text.markAllRead}
          icon={CheckCheck}
          variant="ghost"
          size="sm"
          shape="pill"
          loading={submitting}
          disabled={unread === 0}
          onClick={() => markAllRead(undefined)}
        />
      </PageHeader>

      <Tabs
        id="notifications"
        label={text.tabs}
        value={tab}
        onChange={setTab}
        options={NOTIFICATION_TABS.map((value) => ({ value, label: text.tabNames[value] }))}
      />

      <TabPanel id="notifications" value={tab}>
        <NotificationList tab={tab} />
      </TabPanel>
    </div>
  );
}
