import { createHash, randomBytes } from "node:crypto";

import { type SupabaseClient } from "@supabase/supabase-js";

import { JOB_TYPES } from "@/constants/jobs";
import { EMAIL_CHANGE_LINK_HOURS } from "@/constants/limits";
import { logActionSafe } from "@/lib/audit/auditLog";
import { changeReopensAt } from "@/lib/dates/cooldown";
import { getServerEnv } from "@/lib/env/server";
import { businessRuleError, internalError, validationError } from "@/lib/errors";
import { fromPostgrestError } from "@/lib/errors/fromSupabaseError";
import { createJob } from "@/lib/jobs/queue";
import { logger } from "@/lib/logger";
import { createConfiguredMailService } from "@/lib/mail/nodemailer.provider";
import { createSupabaseAnonClient } from "@/lib/supabase/server";
import type { Tenant } from "@/lib/supabase/tenant";
import type { ChangeEmailPayload, ChangeNamePayload, ChangePhonePayload, ConfirmEmailChangePayload } from "@/lib/validation";

import {
  EMAIL_CONFIRMATION_PATH,
  getProfileById,
  mapDatabaseError,
  mapProfile,
  PROFILE_COLUMNS,
  type ProfileRow,
} from "./api";
import type { AuthProfile } from "./types";

/**
 * The owner's own details, changed from Settings (plan §139.10; the user,
 * 2026-09-26): the name, the sign-in number and the email, each once in 30
 * days from its last change. The sign-in number and the email are how the
 * account is reached, so each asks for the current password first. A new
 * email waits for its confirmation — the same email as at registration, sent
 * through the same queue — and only then replaces the old one.
 *
 * `profiles` is written by the server only (0008), so these act through the
 * service role, on the account the session belongs to and nothing else. The
 * 30 days are also held by a trigger on the row (0021); the check here comes
 * first so a refusal is said before a password is tried or Auth is touched.
 */

/** Where the link that confirms a new email lands: the confirmation page, with the token in the fragment. */
const EMAIL_CHANGE_FRAGMENT = "change";

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** A detail that changed within the last 30 days is refused, before anything else is done. */
function assertChangeable(changedAt: string | null) {
  if (changeReopensAt(changedAt)) throw businessRuleError("PROFILE_CHANGE_TOO_SOON");
}

/**
 * Whether the password is the account's own. It is tried on a client of its
 * own, whose session is signed out at once: the caller's session is not
 * touched. A wrong password is a 400, not a 401 — the caller is signed in,
 * and a 401 would send the browser to refresh a session that is fine.
 */
async function assertPassword(phone: string, password: string) {
  const client = createSupabaseAnonClient();
  const { data, error } = await client.auth.signInWithPassword({ phone, password });
  if (error || !data.session) throw validationError("AUTH_PASSWORD_INCORRECT");
  await client.auth.signOut({ scope: "local" });
}

async function writeProfile(adminClient: SupabaseClient, userId: string, changes: Record<string, unknown>) {
  const { data, error } = await adminClient
    .from("profiles")
    .update(changes)
    .eq("id", userId)
    .select(PROFILE_COLUMNS)
    .single();
  if (error) throw error.code === "P0001" ? fromPostgrestError(error) : mapDatabaseError(error);
  return mapProfile(data as ProfileRow);
}

/** Someone else's account already holds this value. */
async function assertFree(adminClient: SupabaseClient, userId: string, column: "phone" | "email", value: string) {
  const { data, error } = await adminClient.from("profiles").select("id").eq(column, value).neq("id", userId).limit(1);
  if (error) throw internalError("INTERNAL_ERROR", undefined, error);
  if (data && data.length > 0) throw mapDatabaseError({ message: `duplicate ${column}` });
}

/** The owner's name (PATCH /api/auth/name). */
export async function changeName(
  adminClient: SupabaseClient,
  tenant: Tenant,
  profile: AuthProfile,
  input: ChangeNamePayload,
): Promise<AuthProfile> {
  if (input.name === profile.name) throw validationError("PROFILE_VALUE_SAME");
  assertChangeable(profile.nameChangedAt);
  const saved = await writeProfile(adminClient, profile.id, { name: input.name });
  await logActionSafe(tenant, {
    action: "UPDATE",
    entity_type: "profiles",
    entity_id: profile.id,
    previous_data: { name: profile.name },
    new_data: { name: saved.name },
  });
  return saved;
}

/**
 * The sign-in number (PATCH /api/auth/phone). Auth's copy changes first, since
 * it is the one signing in reads; if the profile then cannot follow, Auth's is
 * put back, so the two never disagree about the number.
 */
export async function changePhone(
  adminClient: SupabaseClient,
  tenant: Tenant,
  profile: AuthProfile,
  input: ChangePhonePayload,
): Promise<AuthProfile> {
  if (input.phone === profile.phone) throw validationError("PROFILE_VALUE_SAME");
  assertChangeable(profile.phoneChangedAt);
  await assertFree(adminClient, profile.id, "phone", input.phone);
  await assertPassword(profile.phone, input.password);

  const { error } = await adminClient.auth.admin.updateUserById(profile.id, { phone: input.phone, phone_confirm: true });
  if (error) throw mapDatabaseError(error);

  let saved: AuthProfile;
  try {
    saved = await writeProfile(adminClient, profile.id, { phone: input.phone });
  } catch (failure) {
    const { error: undo } = await adminClient.auth.admin.updateUserById(profile.id, {
      phone: profile.phone,
      phone_confirm: true,
    });
    if (undo) logger.error("Could not put the sign-in number back after a failed change", { userId: profile.id });
    throw failure;
  }

  await logActionSafe(tenant, {
    action: "UPDATE",
    entity_type: "profiles",
    entity_id: profile.id,
    previous_data: { phone: profile.phone },
    new_data: { phone: saved.phone },
  });
  return saved;
}

/**
 * Puts a new email's confirmation on the queue. A second request while one is
 * still waiting adds nothing: the worker reads the address when it runs.
 */
async function queueEmailChange(adminClient: SupabaseClient, userId: string) {
  const { data, error } = await adminClient
    .from("jobs")
    .select("id")
    .eq("type", JOB_TYPES.emailChangeConfirmation)
    .in("status", ["pending", "processing"])
    .eq("payload->>userId", userId)
    .limit(1);
  if (error) throw internalError("INTERNAL_ERROR", undefined, error);
  if (data && data.length > 0) return;
  await createJob(adminClient, { type: JOB_TYPES.emailChangeConfirmation, payload: { userId } });
}

/**
 * A new email address (POST /api/auth/email). It waits in `pending_email`,
 * and the current one stays in use, until the link sent to it is followed. A
 * new request replaces one still waiting.
 */
export async function requestEmailChange(
  adminClient: SupabaseClient,
  tenant: Tenant,
  profile: AuthProfile,
  input: ChangeEmailPayload,
): Promise<AuthProfile> {
  if (input.email === profile.email.toLowerCase()) throw validationError("PROFILE_VALUE_SAME");
  assertChangeable(profile.emailChangedAt);
  await assertFree(adminClient, profile.id, "email", input.email);
  await assertPassword(profile.phone, input.password);

  const saved = await writeProfile(adminClient, profile.id, {
    pending_email: input.email,
    pending_email_token_hash: null,
    pending_email_expires_at: null,
  });
  await queueEmailChange(adminClient, profile.id);
  await logActionSafe(tenant, {
    action: "UPDATE",
    entity_type: "profiles",
    entity_id: profile.id,
    previous_data: { pending_email: profile.pendingEmail },
    new_data: { pending_email: saved.pendingEmail },
  });
  return saved;
}

/** Sends the new email's link again (POST /api/auth/email/resend). */
export async function resendEmailChange(adminClient: SupabaseClient, profile: AuthProfile) {
  if (!profile.pendingEmail) throw validationError("AUTH_NO_PENDING_EMAIL");
  await queueEmailChange(adminClient, profile.id);
  return { queued: true };
}

/**
 * The worker's side (NotificationWorker): a fresh token is made now, not when
 * the job was queued, so none ever sits in the queue; only its hash is kept.
 * The email is the one registration sends. With nothing waiting — confirmed
 * already, or replaced by the same request — there is nothing to send.
 */
export async function sendEmailChangeConfirmation(adminClient: SupabaseClient, userId: string): Promise<void> {
  const profile = await getProfileById(adminClient, userId);
  if (!profile?.pending_email) {
    logger.info("Email change confirmation not needed", { userId });
    return;
  }

  const token = randomBytes(32).toString("base64url");
  const { error } = await adminClient
    .from("profiles")
    .update({
      pending_email_token_hash: hashToken(token),
      pending_email_expires_at: new Date(Date.now() + EMAIL_CHANGE_LINK_HOURS * 3_600_000).toISOString(),
    })
    .eq("id", userId);
  if (error) throw internalError("INTERNAL_ERROR", undefined, error);

  const env = getServerEnv();
  await createConfiguredMailService(env).sendAccountConfirmation({
    to: profile.pending_email,
    name: profile.name,
    confirmationUrl: `${env.NEXT_PUBLIC_APP_URL}${EMAIL_CONFIRMATION_PATH}#${EMAIL_CHANGE_FRAGMENT}=${token}`,
  });
}

interface PendingRow extends ProfileRow {
  pending_email_expires_at: string | null;
}

/**
 * The link was followed (POST /api/auth/email/confirm): holding the token
 * proves the address is theirs, so no session is needed. Auth's copy changes
 * first; if the profile then cannot follow, Auth's is put back.
 */
export async function confirmEmailChange(
  adminClient: SupabaseClient,
  input: ConfirmEmailChangePayload,
): Promise<{ email: string }> {
  const { data, error } = await adminClient
    .from("profiles")
    .select(`${PROFILE_COLUMNS}, pending_email_expires_at`)
    .eq("pending_email_token_hash", hashToken(input.token))
    .maybeSingle();
  if (error) throw internalError("INTERNAL_ERROR", undefined, error);

  const row = data as PendingRow | null;
  if (!row?.pending_email || !row.pending_email_expires_at || new Date(row.pending_email_expires_at) <= new Date()) {
    throw validationError("AUTH_EMAIL_CONFIRM_FAILED");
  }

  const email = row.pending_email;
  const { error: authError } = await adminClient.auth.admin.updateUserById(row.id, { email, email_confirm: true });
  if (authError) throw mapDatabaseError(authError);

  let saved: AuthProfile;
  try {
    saved = await writeProfile(adminClient, row.id, {
      email,
      email_confirmed_at: new Date().toISOString(),
      pending_email: null,
      pending_email_token_hash: null,
      pending_email_expires_at: null,
    });
  } catch (failure) {
    const { error: undo } = await adminClient.auth.admin.updateUserById(row.id, { email: row.email, email_confirm: true });
    if (undo) logger.error("Could not put the email back after a failed change", { userId: row.id });
    throw failure;
  }

  await logActionSafe(
    { supabase: adminClient, bakeryId: row.bakery_id, actorId: row.id },
    {
      action: "UPDATE",
      entity_type: "profiles",
      entity_id: row.id,
      previous_data: { email: row.email },
      new_data: { email: saved.email },
    },
  );
  return { email: saved.email };
}
