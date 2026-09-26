import { z } from "zod";

import { VALIDATION_MESSAGES } from "@/constants/messages";
import { NOTIFICATION_TABS } from "@/constants/statuses";

import { cursorParam } from "./list";

/**
 * `GET /api/notifications` (plan §139.10): one of the inbox's tabs — all of
 * them when none is named — and where the page starts.
 */
export const notificationListQuerySchema = z.object({
  tab: z.enum(NOTIFICATION_TABS, { error: VALIDATION_MESSAGES.invalid }).default("ALL"),
  cursor: cursorParam,
});

/** One notification, named by its id in the path. */
export const notificationIdSchema = z.uuid({ error: VALIDATION_MESSAGES.invalid });

export type NotificationListQuery = z.output<typeof notificationListQuerySchema>;
