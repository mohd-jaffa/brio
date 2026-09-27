import { type Session, type SupabaseClient } from "@supabase/supabase-js";

import { avatarOr } from "@/constants/avatars";
import { getServerEnv, type ServerEnv } from "@/lib/env/server";
import {
  authenticationError,
  authorizationError,
  conflictError,
  externalServiceError,
  internalError,
} from "@/lib/errors";
import { logger } from "@/lib/logger";
import { JOB_TYPES, WORKER_ENABLED } from "@/constants/jobs";
import { createJob } from "@/lib/jobs/queue";
import { asMailFailure } from "@/lib/mail/failure";
import { createConfiguredMailService } from "@/lib/mail/nodemailer.provider";
import type {
  ChangePasswordPayload,
  ConfirmEmailPayload,
  LoginPayload,
  PasswordResetRequestPayload,
  RegisterPayload,
} from "@/lib/validation";

import { generateTemporaryPassword } from "./security";
import {
  type AuthProfile,
  type AuthSessionView,
  type AuthenticatedSession,
  type UserRole,
} from "./types";

/** Where the confirmation link in the welcome email lands. */
export const EMAIL_CONFIRMATION_PATH = "/confirm-email";

export const PROFILE_COLUMNS =
  "id, phone, email, name, avatar, role, bakery_id, is_active, must_change_password, email_confirmed_at, name_changed_at, phone_changed_at, email_changed_at, pending_email";

export interface ProfileRow {
  id: string;
  phone: string;
  email: string;
  name: string;
  avatar: string;
  role: UserRole;
  bakery_id: string | null;
  is_active: boolean;
  must_change_password: boolean;
  email_confirmed_at: string | null;
  name_changed_at: string | null;
  phone_changed_at: string | null;
  email_changed_at: string | null;
  pending_email: string | null;
}

// ------------------------------------------------------------------
// Error Mapping
// ------------------------------------------------------------------

/**
 * Supabase says "duplicate key value violates unique constraint …" whichever
 * field collided. The baker needs to know which one, and must not be shown the
 * driver's own sentence (AGENTS.md §10), so the column is read out of it here.
 */
export function mapDatabaseError(error: unknown) {
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message: unknown }).message).toLowerCase()
      : "";

  if (message.includes("phone")) {
    return conflictError("AUTH_PHONE_ALREADY_EXISTS");
  }

  if (message.includes("email")) {
    return conflictError("AUTH_EMAIL_ALREADY_EXISTS");
  }

  if (message.includes("duplicate") || message.includes("unique")) {
    return conflictError();
  }

  return externalServiceError("EXTERNAL_SERVICE_ERROR", undefined, error);
}

// ------------------------------------------------------------------
// Repository Logic
// ------------------------------------------------------------------

export async function createBakeryAndProfile(
  client: SupabaseClient,
  input: {
    userId: string;
    businessName: string;
    tagline: string | null;
    city: string;
    address: string;
    phone: string;
    email: string;
    name: string;
  },
) {
  const { data: bakeryData, error: bakeryError } = await client
    .from("bakeries")
    .insert({
      owner_id: input.userId,
      business_name: input.businessName,
      tagline: input.tagline,
      city: input.city,
      address: input.address,
      // The business phone printed on the bill starts as the sign-in number.
      phone: input.phone,
      currency: "INR",
      timezone: "Asia/Kolkata",
    })
    .select("id")
    .single();

  if (bakeryError || !bakeryData) {
    throw mapDatabaseError(bakeryError);
  }

  const bakeryId = String((bakeryData as { id: string }).id);

  const { data: profileData, error: profileError } = await client
    .from("profiles")
    .insert({
      id: input.userId,
      phone: input.phone,
      email: input.email,
      name: input.name,
      role: "USER",
      bakery_id: bakeryId,
      is_active: true,
      must_change_password: false,
    })
    .select(PROFILE_COLUMNS)
    .single();

  if (profileError || !profileData) {
    // A bakery with no owner profile is unreachable and blocks the owner's
    // next attempt, because owner_id is unique.
    await client.from("bakeries").delete().eq("id", bakeryId);
    throw mapDatabaseError(profileError);
  }

  return {
    bakeryId,
    profile: profileData as ProfileRow,
  };
}

export async function getProfileById(
  client: SupabaseClient,
  userId: string,
): Promise<ProfileRow | null> {
  const { data, error } = await client
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw mapDatabaseError(error);
  }

  return data as ProfileRow | null;
}

export async function getProfileByEmail(
  client: SupabaseClient,
  email: string,
): Promise<ProfileRow | null> {
  const { data, error } = await client
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("email", email)
    .maybeSingle();

  if (error) {
    throw mapDatabaseError(error);
  }

  return data as ProfileRow | null;
}

async function setPasswordChangeRequirement(
  client: SupabaseClient,
  userId: string,
  required: boolean,
): Promise<void> {
  const { error } = await client
    .from("profiles")
    .update({ must_change_password: required })
    .eq("id", userId);

  if (error) {
    throw mapDatabaseError(error);
  }
}

export const requirePasswordChange = (client: SupabaseClient, userId: string) =>
  setPasswordChangeRequirement(client, userId, true);

export const clearPasswordChangeRequirement = (client: SupabaseClient, userId: string) =>
  setPasswordChangeRequirement(client, userId, false);

async function markEmailConfirmed(client: SupabaseClient, userId: string, at: string) {
  const { error } = await client
    .from("profiles")
    .update({ email_confirmed_at: at })
    .eq("id", userId);

  if (error) {
    throw mapDatabaseError(error);
  }
}

// ------------------------------------------------------------------
// Service Logic
// ------------------------------------------------------------------

export function mapProfile(row: ProfileRow): AuthProfile {
  return {
    id: row.id,
    phone: row.phone,
    email: row.email,
    name: row.name,
    avatar: avatarOr(row.avatar),
    role: row.role,
    bakeryId: row.bakery_id,
    isActive: row.is_active,
    mustChangePassword: row.must_change_password,
    emailConfirmedAt: row.email_confirmed_at,
    nameChangedAt: row.name_changed_at,
    phoneChangedAt: row.phone_changed_at,
    emailChangedAt: row.email_changed_at,
    pendingEmail: row.pending_email,
  };
}

function buildAuthenticatedSession(session: Session, profile: AuthProfile): AuthenticatedSession {
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at ?? null,
    profile,
    requiresPasswordChange: profile.mustChangePassword,
  };
}

/** What the browser is allowed to see of a session: everything except the tokens. */
export function toSessionView(session: AuthenticatedSession): AuthSessionView {
  return {
    profile: session.profile,
    requiresPasswordChange: session.requiresPasswordChange,
  };
}

async function createConfirmationUrl(client: SupabaseClient, email: string, env: ServerEnv) {
  const { data, error } = await client.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: {
      redirectTo: `${env.NEXT_PUBLIC_APP_URL}${EMAIL_CONFIRMATION_PATH}`,
    },
  });

  if (error || !data.properties?.action_link) {
    throw externalServiceError("EXTERNAL_SERVICE_ERROR", undefined, error);
  }

  return data.properties.action_link;
}

async function rollbackCreatedUser(client: SupabaseClient, userId: string) {
  const { error } = await client.auth.admin.deleteUser(userId);

  if (error) {
    logger.error("Failed to roll back auth user after registration failure", {
      userId,
      error,
    });
  }
}

async function fetchProfile(client: SupabaseClient, userId: string): Promise<AuthProfile> {
  const profile = await getProfileById(client, userId);
  if (!profile) {
    throw authenticationError("AUTH_SESSION_INVALID");
  }
  return mapProfile(profile);
}

/** A deactivated account keeps its rows but may not act (plan §64). */
function assertActive(profile: AuthProfile) {
  if (!profile.isActive) throw authorizationError("AUTH_ACCOUNT_INACTIVE");
}

export async function register(client: SupabaseClient, registration: RegisterPayload) {
  const { data: userData, error: userError } = await client.auth.admin.createUser({
    email: registration.email,
    phone: registration.phone,
    password: registration.password,
    email_confirm: false,
    phone_confirm: true,
    // Only the name. A user can edit their own metadata, so a role kept here
    // could never be trusted; the role lives on `profiles` (BUG-17).
    user_metadata: {
      name: registration.name,
    },
  });

  if (userError) {
    throw mapDatabaseError(userError);
  }

  const user = userData.user;
  if (!user) {
    throw internalError();
  }

  let created: Awaited<ReturnType<typeof createBakeryAndProfile>>;
  try {
    created = await createBakeryAndProfile(client, {
      userId: user.id,
      businessName: registration.businessName,
      tagline: registration.tagline,
      city: registration.city,
      address: registration.address,
      phone: registration.phone,
      email: registration.email,
      name: registration.name,
    });
  } catch (error) {
    // Without this the phone and email stay taken by an account that has no
    // bakery, and the same person can never register again.
    await rollbackCreatedUser(client, user.id);
    throw error;
  }

  // The account is made whether or not mail is working (BUG-16): the email
  // is sent now (or queued, while a worker runs), and if it cannot go, the
  // account still stands and Settings offers to send it again.
  try {
    await deliverAccountConfirmation(client, user.id);
  } catch (error) {
    logger.error("Could not send the confirmation email", {
      userId: user.id,
      reason: error instanceof Error ? error.message : String(error),
    });
  }

  return {
    userId: user.id,
    bakeryId: created.bakeryId,
    profile: mapProfile(created.profile),
  };
}

/**
 * Puts a confirmation email on the queue for this user (plan §17). A second
 * request while one is still waiting adds nothing, so tapping Resend twice
 * sends one email.
 */
export async function queueAccountConfirmation(adminClient: SupabaseClient, userId: string): Promise<void> {
  const { data, error } = await adminClient
    .from("jobs")
    .select("id")
    .eq("type", JOB_TYPES.accountConfirmation)
    .in("status", ["pending", "processing"])
    .eq("payload->>userId", userId)
    .limit(1);

  if (error) throw internalError("INTERNAL_ERROR", undefined, error);
  if (data && data.length > 0) return;

  await createJob(adminClient, { type: JOB_TYPES.accountConfirmation, payload: { userId } });
}

/**
 * Sends the confirmation: from the request while no worker runs, and as the
 * worker's side of a queued one (NotificationWorker) when one does. The link
 * is made now, not when a job was queued, so no sign-in token ever sits in the
 * queue. An account already confirmed, or gone, needs no email; anything else
 * that fails throws, so the queue tries again.
 */
export async function sendAccountConfirmation(adminClient: SupabaseClient, userId: string): Promise<void> {
  const profile = await getProfileById(adminClient, userId);
  if (!profile || profile.email_confirmed_at) {
    logger.info("Confirmation email not needed", { userId, reason: profile ? "confirmed" : "no account" });
    return;
  }

  const env = getServerEnv();
  const mailService = createConfiguredMailService(env);
  const confirmationUrl = await createConfirmationUrl(adminClient, profile.email, env);
  await mailService.sendAccountConfirmation({ to: profile.email, name: profile.name, confirmationUrl });
}

/**
 * The confirmation email, sent by the request that asks for it while no
 * worker runs (WORKER_ENABLED; the user, 2026-09-27), and queued for the
 * worker when one does. Answers whether it was queued.
 */
export async function deliverAccountConfirmation(adminClient: SupabaseClient, userId: string): Promise<boolean> {
  if (WORKER_ENABLED) {
    await queueAccountConfirmation(adminClient, userId);
    return true;
  }
  await sendAccountConfirmation(adminClient, userId);
  return false;
}

/**
 * Settings' Resend confirmation (plan §139.11.2), for the signed-in account.
 * Sent there and then, a mail failure is the answer; `queued` says whether it
 * waits for the worker instead.
 */
export async function resendConfirmation(adminClient: SupabaseClient, profile: AuthProfile) {
  if (profile.emailConfirmedAt) throw conflictError("AUTH_EMAIL_ALREADY_CONFIRMED");
  try {
    return { queued: await deliverAccountConfirmation(adminClient, profile.id) };
  } catch (error) {
    throw asMailFailure(error);
  }
}

export async function login(
  client: SupabaseClient,
  credentials: LoginPayload,
): Promise<AuthenticatedSession> {
  const { data, error } = await client.auth.signInWithPassword({
    phone: credentials.phone,
    password: credentials.password,
  });

  // One message for a wrong password and for a phone number with no account:
  // telling them apart tells an attacker which numbers are registered.
  if (error || !data.session || !data.user) {
    throw authenticationError("AUTH_INVALID_CREDENTIALS");
  }

  const profile = await fetchProfile(client, data.user.id);
  assertActive(profile);

  return buildAuthenticatedSession(data.session, profile);
}

/**
 * Ends the session the caller is holding. The token is revoked at Supabase, so
 * it cannot be replayed even if it was copied before the cookies were cleared;
 * a token already expired or missing is not an error — the caller wanted to be
 * signed out, and they are.
 */
export async function logout(client: SupabaseClient) {
  const { error } = await client.auth.signOut();

  if (error) {
    logger.warn("Sign out could not revoke the session", { error: error.message });
  }

  return { signedOut: true };
}

export async function getSession(
  client: SupabaseClient,
  accessToken: string,
): Promise<AuthenticatedSession> {
  const { data, error } = await client.auth.getUser(accessToken);

  if (error || !data.user) {
    throw authenticationError("AUTH_SESSION_INVALID");
  }

  const profile = await fetchProfile(client, data.user.id);
  assertActive(profile);

  return {
    accessToken,
    refreshToken: "",
    expiresAt: null,
    profile,
    requiresPasswordChange: profile.mustChangePassword,
  };
}

/**
 * Trades a refresh token for a fresh access token (plan §19). Called when a
 * request is refused for an expired token, so a baker keeps working instead of
 * being sent back to sign-in every hour.
 */
export async function refreshSession(
  client: SupabaseClient,
  adminClient: SupabaseClient,
  refreshToken: string,
): Promise<AuthenticatedSession> {
  const { data, error } = await client.auth.refreshSession({ refresh_token: refreshToken });

  if (error || !data.session || !data.user) {
    throw authenticationError("AUTH_SESSION_INVALID");
  }

  const profile = await fetchProfile(adminClient, data.user.id);
  assertActive(profile);

  return buildAuthenticatedSession(data.session, profile);
}

/**
 * Completes the link in the welcome email (plan §7). Supabase has already
 * verified the address by the time these tokens exist; what is left is to
 * record it on the profile and hand the baker a signed-in session, so
 * confirming lands them in the app rather than back at sign-in.
 */
export async function confirmEmail(
  client: SupabaseClient,
  adminClient: SupabaseClient,
  tokens: ConfirmEmailPayload,
): Promise<AuthenticatedSession> {
  const { data, error } = await client.auth.setSession({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
  });

  if (error || !data.session || !data.user) {
    throw authenticationError("AUTH_EMAIL_CONFIRM_FAILED");
  }

  const confirmedAt = data.user.email_confirmed_at ?? new Date().toISOString();
  await markEmailConfirmed(adminClient, data.user.id, confirmedAt);

  const profile = await fetchProfile(adminClient, data.user.id);
  assertActive(profile);

  return buildAuthenticatedSession(data.session, profile);
}

/**
 * The reset flow the plan approves (§94): a cryptographically random temporary
 * password is set, the account is marked as owing a password change, and the
 * password is emailed. The answer is the same whether or not the address
 * belongs to an account, so this endpoint cannot be used to discover who has
 * one; the temporary password is never returned and never logged.
 */
export async function requestPasswordReset(
  client: SupabaseClient,
  resetRequest: PasswordResetRequestPayload,
) {
  const mailService = createConfiguredMailService();
  const profile = await getProfileByEmail(client, resetRequest.email);

  if (!profile || !profile.is_active) {
    return { accepted: true };
  }

  const temporaryPassword = generateTemporaryPassword();
  const { error: updateUserError } = await client.auth.admin.updateUserById(profile.id, {
    password: temporaryPassword,
  });

  if (updateUserError) {
    throw externalServiceError("EXTERNAL_SERVICE_ERROR", undefined, updateUserError);
  }

  await requirePasswordChange(client, profile.id);

  await mailService.sendPasswordResetTemporaryPassword({
    to: profile.email,
    name: profile.name,
    temporaryPassword,
  });

  return { accepted: true };
}

/**
 * Replaces the caller's password and lifts the forced-change flag (plan §95).
 * The token is resolved to a user first, so the change can only ever be
 * applied to the account that asked for it, and every other session that
 * account has open is revoked — a password changed after a reset must not
 * leave the temporary one working anywhere else (plan §19).
 */
export async function changePassword(
  adminClient: SupabaseClient,
  accessToken: string,
  passwordChange: ChangePasswordPayload,
): Promise<AuthSessionView> {
  const { data: userData, error: userError } = await adminClient.auth.getUser(accessToken);

  if (userError || !userData.user) {
    throw authenticationError("AUTH_SESSION_INVALID");
  }

  const userId = userData.user.id;

  const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
    password: passwordChange.newPassword,
  });

  if (updateError) {
    throw externalServiceError("EXTERNAL_SERVICE_ERROR", undefined, updateError);
  }

  await clearPasswordChangeRequirement(adminClient, userId);
  await revokeOtherSessions(adminClient, accessToken);

  const profile = await fetchProfile(adminClient, userId);

  return {
    profile,
    requiresPasswordChange: false,
  };
}

/** Best effort: the password is already changed, so a failure here is logged, not raised. */
async function revokeOtherSessions(adminClient: SupabaseClient, accessToken: string) {
  try {
    const { error } = await adminClient.auth.admin.signOut(accessToken, "others");
    if (error) logger.warn("Could not revoke other sessions after a password change");
  } catch {
    logger.warn("Could not revoke other sessions after a password change");
  }
}
