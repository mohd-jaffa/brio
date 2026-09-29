import type { SupabaseClient } from "@supabase/supabase-js";
import webpush, { WebPushError } from "web-push";

import { PUSH_TTL_SECONDS } from "@/constants/limits";
import type { DevicePlatform } from "@/constants/statuses";
import { webPushKeys } from "@/lib/env/server";
import { businessRuleError } from "@/lib/errors";
import { fromPostgrestError } from "@/lib/errors/fromSupabaseError";
import { logger } from "@/lib/logger";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import type { Tenant } from "@/lib/supabase/tenant";
import type { PushSubscriptionPayload } from "@/lib/validation";

import { notificationLink, notificationText, type NotificationMessage } from "./text";

const WEB: DevicePlatform = "WEB";

interface DeviceRow {
  id: string;
  token: string;
  p256dh: string;
  auth: string;
}

/** What a browser is sent (public/sw.js reads it): the words, where a tap leads, and a tag, so a repeat replaces rather than stacks. */
export interface PushMessage {
  title: string;
  body: string;
  url: string | null;
  tag: string;
}

export function pushMessage(message: NotificationMessage): PushMessage {
  const { title, body } = notificationText(message);
  const about = "orderId" in message && message.orderId ? `:${message.orderId}` : "";
  return { title, body, url: notificationLink(message), tag: `${message.kind}${about}` };
}

/**
 * `POST /api/notifications/devices` (R8.6): this browser wants the business's
 * reminders. It is kept against the signed-in owner, taking it over from
 * whoever had it before on this browser, and its last sight is renewed each
 * time the app opens. Through the service role: only the server keeps these
 * (0031).
 */
export async function registerDevice(tenant: Tenant, subscription: PushSubscriptionPayload): Promise<{ registered: true }> {
  if (!webPushKeys()) throw businessRuleError("PUSH_UNAVAILABLE");
  const { error } = await createSupabaseServiceRoleClient()
    .from("device_tokens")
    .upsert(
      {
        bakery_id: tenant.bakeryId,
        profile_id: tenant.actorId,
        platform: WEB,
        token: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "token" },
    );
  if (error) throw fromPostgrestError(error);
  return { registered: true };
}

/** Why a push failed, for the log: never the address, which reaches one person's device. */
const reason = (failure: unknown) =>
  failure instanceof WebPushError ? { status: failure.statusCode } : { reason: failure instanceof Error ? failure.message : String(failure) };

/**
 * Pushes each message to every browser of the business that wants them
 * (R8.6), encrypted to each. A browser its push service no longer knows (404,
 * 410) is let go; any other failure is logged and the rest go on. Nothing
 * throws: the inbox already has them. Nothing is sent while web push has no
 * keys.
 */
export async function pushToBusiness(
  client: SupabaseClient,
  bakeryId: string,
  messages: readonly NotificationMessage[],
): Promise<{ sent: number; gone: number }> {
  const keys = webPushKeys();
  if (!keys || messages.length === 0) return { sent: 0, gone: 0 };

  const { data, error } = await client
    .from("device_tokens")
    .select("id, token, p256dh, auth")
    .eq("bakery_id", bakeryId)
    .eq("platform", WEB);
  if (error) {
    logger.warn("Push devices not read", { bakeryId, reason: error.message });
    return { sent: 0, gone: 0 };
  }

  let sent = 0;
  const gone = new Set<string>();
  for (const device of (data ?? []) as DeviceRow[]) {
    for (const message of messages) {
      if (gone.has(device.id)) break;
      try {
        await webpush.sendNotification(
          { endpoint: device.token, keys: { p256dh: device.p256dh, auth: device.auth } },
          JSON.stringify(pushMessage(message)),
          { TTL: PUSH_TTL_SECONDS, urgency: "normal", vapidDetails: keys },
        );
        sent += 1;
      } catch (failure) {
        if (failure instanceof WebPushError && (failure.statusCode === 404 || failure.statusCode === 410)) gone.add(device.id);
        else logger.warn("Push not sent", { bakeryId, deviceId: device.id, ...reason(failure) });
      }
    }
  }

  if (gone.size > 0) {
    const { error: removal } = await client.from("device_tokens").delete().in("id", [...gone]);
    if (removal) logger.warn("Gone push devices not removed", { bakeryId, reason: removal.message });
  }
  if (sent > 0 || gone.size > 0) logger.info("Pushed reminders", { bakeryId, sent, gone: gone.size });
  return { sent, gone: gone.size };
}
