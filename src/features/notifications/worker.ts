import type { SupabaseClient } from "@supabase/supabase-js";

import { JOB_TYPES } from "@/constants/jobs";
import { registerJobHandler, registerSweep } from "@/lib/jobs/queue";
import { CapacitorPushProvider } from "./capacitor-push.service";
import { type Job } from "@/lib/jobs/types";
import { queueDueOrderNotifications, recordNotification } from "./api";
import { notificationKind, notificationLink, notificationText, readNotificationMessage } from "./text";
import { type NotificationPayload } from "./types";
import { logger } from "@/lib/logger";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { sendEmailChangeConfirmation } from "@/features/auth/account";
import { sendAccountConfirmation } from "@/features/auth/api";

const pushProvider = new CapacitorPushProvider();

export function registerNotificationWorker() {
  registerJobHandler(JOB_TYPES.pushNotification, handlePushNotification);
  registerJobHandler(JOB_TYPES.accountConfirmation, handleAccountConfirmation);
  registerJobHandler(JOB_TYPES.emailChangeConfirmation, handleEmailChangeConfirmation);
  registerSweep("due orders", sweepDueOrders);
  logger.info("NotificationWorker registered handlers");
}

/** Orders due soon, and overdue, each told once (0023; the user, 2026-09-26). */
async function sweepDueOrders(client: SupabaseClient): Promise<void> {
  const queued = await queueDueOrderNotifications(client);
  if (queued > 0) logger.info("Queued notifications for orders due", { queued });
}

/** The confirmation email queued at registration or by Resend (BUG-16). */
async function handleAccountConfirmation(job: Job): Promise<void> {
  const { userId } = job.payload as { userId?: string };
  if (!userId) throw new Error("Confirmation job has no user");
  await sendAccountConfirmation(createSupabaseServiceRoleClient(), userId);
}

/** The link to a new email address, which takes over once it is followed (the user, 2026-09-26). */
async function handleEmailChangeConfirmation(job: Job): Promise<void> {
  const { userId } = job.payload as { userId?: string };
  if (!userId) throw new Error("Email change job has no user");
  await sendEmailChangeConfirmation(createSupabaseServiceRoleClient(), userId);
}

/**
 * A notification: into the business's inbox (0022), then to its device. The
 * job says what happened (`message`, src/features/notifications/text.ts) and
 * the words are written now, from messages.ts (BUG-26). A job queued before
 * that carries its words ready-made (`payload`), and is filed as the system's.
 */
async function handlePushNotification(job: Job): Promise<void> {
  const {
    token,
    bakeryId,
    payload: written,
    message,
  } = job.payload as {
    token?: string;
    bakeryId?: string;
    payload?: NotificationPayload;
    message?: unknown;
  };

  const known = readNotificationMessage(message);
  const payload = known ? notificationText(known) : written;
  if (!payload) {
    throw new Error("Push notification job has no message");
  }

  if (bakeryId) {
    await recordNotification(createSupabaseServiceRoleClient(), {
      id: job.id,
      bakeryId,
      kind: known ? notificationKind(known) : "SYSTEM",
      text: payload,
      actionUrl: known ? notificationLink(known) : null,
    });
  }

  // No device is registered for this bakery yet (the token registry is not
  // built). Nothing to deliver is not a failure, so the job completes rather
  // than retrying its way into the dead-letter list.
  if (!token) {
    logger.info("Push notification skipped: no device registered", { jobId: job.id });
    return;
  }

  if (!(await pushProvider.sendPush(token, payload))) {
    throw new Error("Failed to send push notification");
  }
}
