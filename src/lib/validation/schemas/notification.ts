import * as z from "zod";

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

/** A key a browser hands over, base64url: short, and never altered. */
const pushKey = (max: number) =>
  z
    .string({ error: VALIDATION_MESSAGES.invalid })
    .regex(/^[A-Za-z0-9_-]+={0,2}$/, VALIDATION_MESSAGES.invalid)
    .max(max, VALIDATION_MESSAGES.invalid);

/**
 * `POST /api/notifications/devices` (R8.6): a browser's push subscription, as
 * `PushSubscription.toJSON()` gives it — its push service's address, always
 * https, and the keys that encrypt what is sent to it. Bounded as 0031 is.
 */
export const pushSubscriptionSchema = z.object({
  endpoint: z
    .url({ protocol: /^https$/, error: VALIDATION_MESSAGES.invalid })
    .max(1024, VALIDATION_MESSAGES.invalid),
  keys: z.object({
    p256dh: pushKey(200),
    auth: pushKey(100),
  }),
});

export type NotificationListQuery = z.output<typeof notificationListQuerySchema>;
export type PushSubscriptionInput = z.input<typeof pushSubscriptionSchema>;
export type PushSubscriptionPayload = z.output<typeof pushSubscriptionSchema>;
