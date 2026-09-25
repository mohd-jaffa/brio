import { type Session, type SupabaseClient } from "@supabase/supabase-js";

import { getServerEnv, type ServerEnv } from "@/lib/env/server";
import {
  authenticationError,
  authorizationError,
  conflictError,
  externalServiceError,
  internalError,
} from "@/lib/errors";
import { logger } from "@/lib/logger";
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

const PROFILE_COLUMNS =
  "id, phone, email, name, role, bakery_id, is_active, must_change_password, email_confirmed_at";

export interface ProfileRow {
  id: string;
  phone: string;
  email: string;
  name: string;
  role: UserRole;
  bakery_id: string;
  is_active: boolean;
  must_change_password: boolean;
  email_confirmed_at: string | null;
}

// ------------------------------------------------------------------
// Error Mapping
// ------------------------------------------------------------------

/**
 * Supabase says "duplicate key value violates unique constraint …" whichever
 * field collided. The baker needs to know which one, and must not be shown the
 * driver's own sentence (AGENTS.md §10), so the column is read out of it here.
 */
function mapDatabaseError(error: unknown) {
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

function mapProfile(row: ProfileRow): AuthProfile {
  return {
    id: row.id,
    phone: row.phone,
    email: row.email,
    name: row.name,
    role: row.role,
    bakeryId: row.bakery_id,
    isActive: row.is_active,
    mustChangePassword: row.must_change_password,
    emailConfirmedAt: row.email_confirmed_at,
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
  const env = getServerEnv();
  const mailService = createConfiguredMailService();

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

  try {
    const { bakeryId, profile } = await createBakeryAndProfile(client, {
      userId: user.id,
      businessName: registration.businessName,
      phone: registration.phone,
      email: registration.email,
      name: registration.name,
    });

    const confirmationUrl = await createConfirmationUrl(client, registration.email, env);
    await mailService.sendAccountConfirmation({
      to: registration.email,
      name: registration.name,
      confirmationUrl,
    });

    return {
      userId: user.id,
      bakeryId,
      profile: mapProfile(profile),
    };
  } catch (error) {
    // Without this the phone and email stay taken by an account that has no
    // bakery, and the same person can never register again.
    await rollbackCreatedUser(client, user.id);
    throw error;
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
