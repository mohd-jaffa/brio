"use client";

import { Bell, ClipboardList, PackageOpen, UserPlus, Wallet, type LucideIcon } from "lucide-react";

import { Medallion, type MedallionTone } from "@/components/ui/medallion";
import { Row } from "@/components/ui/row";
import { UI_TEXT } from "@/constants/messages";
import type { NotificationKind } from "@/constants/statuses";
import { formatRecent } from "@/lib/format/date";

import type { AppNotification } from "../types";

/** Each kind's medallion, as the reference draws them: orders warm, money green, low stock red. */
const KIND_MEDALLIONS: Record<NotificationKind, { icon: LucideIcon; tone: MedallionTone }> = {
  ORDER: { icon: ClipboardList, tone: "primary" },
  PAYMENT: { icon: Wallet, tone: "success" },
  STOCK: { icon: PackageOpen, tone: "danger" },
  CUSTOMER: { icon: UserPlus, tone: "neutral" },
  SYSTEM: { icon: Bell, tone: "neutral" },
};

/**
 * One notification (plan §139.10): what it is about, what happened, when,
 * and a dot while it is unread. Tapping it follows its link and marks it
 * read; one that leads nowhere is marked read where it is.
 */
export function NotificationRow({
  notification,
  onRead,
}: {
  notification: AppNotification;
  onRead: (notification: AppNotification) => void;
}) {
  const { kind, title, body, actionUrl, read, createdAt } = notification;
  const medallion = KIND_MEDALLIONS[kind];

  return (
    <Row
      leading={<Medallion icon={medallion.icon} tone={medallion.tone} size="sm" />}
      title={<span className={read ? "font-medium" : undefined}>{title}</span>}
      subtitle={body}
      wrap
      trailing={
        <>
          <time dateTime={createdAt} className="text-xs font-medium text-text-muted">
            {formatRecent(createdAt)}
          </time>
          {!read && (
            <span data-unread-dot className="size-2 rounded-full bg-primary">
              <span className="sr-only">{UI_TEXT.notifications.unread}</span>
            </span>
          )}
        </>
      }
      href={actionUrl ?? undefined}
      onClick={read ? undefined : () => onRead(notification)}
      chevron={actionUrl !== null}
    />
  );
}
