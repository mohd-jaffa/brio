import { type Session, type SupabaseClient } from "@supabase/supabase-js";
import { getServerEnv, type ServerEnv } from "@/lib/env/server";
import { createConfiguredMailService } from "@/lib/mail/nodemailer.provider";
import {
  authenticationError,
  authorizationError,
  conflictError,
  externalServiceError,
  internalError,
} from "@/lib/errors";
import { logger } from "@/lib/logger";
import { generateTemporaryPassword } from "@/features/auth/security";
import {
  changePasswordSchema,
  loginSchema,
  passwordResetRequestSchema,
  registerSchema,
  type ChangePasswordInput,
  type LoginInput,
  type PasswordResetRequestInput,
  type RegisterInput,
} from "@/lib/validation";
import { type AuthenticatedSession, type AuthProfile, type UserRole } from "@/features/auth/types";

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

function mapAuthMutationError(error: unknown) {
  return mapDatabaseError(error);
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
  }
) {
  // 1. Create Bakery
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

  // 2. Create Profile
  const { data: profileData, error: profileError } = await client
    .from("profiles")
    .insert({
      id: input.userId,
      phone: input.phone,
      email: input.email,
      name: input.name,
      role: "BAKER",
      bakery_id: bakeryId,
      is_active: true,
      must_change_password: false,
    })
    .select(
      "id, phone, email, name, role, bakery_id, is_active, must_change_password, email_confirmed_at"
    )
    .single();

  if (profileError || !profileData) {
    // Rollback bakery creation if profile fails
    await client.from("bakeries").delete().eq("id", bakeryId);
    throw mapDatabaseError(profileError);
  }

  return {
    bakeryId,
    profile: profileData as ProfileRow,
  };
}

export async function getProfileById(client: SupabaseClient, userId: string): Promise<ProfileRow | null> {
  const { data, error } = await client
    .from("profiles")
    .select(
      "id, phone, email, name, role, bakery_id, is_active, must_change_password, email_confirmed_at"
    )
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw mapDatabaseError(error);
  }

  return data as ProfileRow | null;
}

export async function getProfileByEmail(client: SupabaseClient, email: string): Promise<ProfileRow | null> {
  const { data, error } = await client
    .from("profiles")
    .select(
      "id, phone, email, name, role, bakery_id, is_active, must_change_password, email_confirmed_at"
    )
    .eq("email", email)
    .maybeSingle();

  if (error) {
    throw mapDatabaseError(error);
  }

  return data as ProfileRow | null;
}

export async function requirePasswordChange(client: SupabaseClient, userId: string): Promise<void> {
  const { error } = await client
    .from("profiles")
    .update({ must_change_password: true })
    .eq("id", userId);

  if (error) {
    throw mapDatabaseError(error);
  }
}

export async function clearPasswordChangeRequirement(client: SupabaseClient, userId: string): Promise<void> {
  const { error } = await client
    .from("profiles")
    .update({ must_change_password: false })
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

async function createConfirmationUrl(client: SupabaseClient, email: string, env: ServerEnv) {
  const { data, error } = await client.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: {
      redirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/confirm`,
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

export async function register(client: SupabaseClient, input: RegisterInput) {
  const registration = registerSchema.parse(input);
  const env = getServerEnv();
  const mailService = createConfiguredMailService();

  const { data: userData, error: userError } = await client.auth.admin.createUser({
    email: registration.email,
    phone: registration.phone,
    password: registration.password,
    email_confirm: false,
    phone_confirm: true,
    user_metadata: {
      name: registration.name,
      role: "BAKER",
    },
  });

  if (userError) {
    throw mapAuthMutationError(userError);
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
    await rollbackCreatedUser(client, user.id);
    throw error;
  }
}

export async function login(client: SupabaseClient, input: LoginInput): Promise<AuthenticatedSession> {
  const credentials = loginSchema.parse(input);

  const { data, error } = await client.auth.signInWithPassword({
    phone: credentials.phone,
    password: credentials.password,
  });

  if (error || !data.session || !data.user) {
    throw authenticationError("AUTH_INVALID_CREDENTIALS");
  }

  const profile = await fetchProfile(client, data.user.id);

  if (!profile.isActive) {
    throw authorizationError("AUTH_ACCOUNT_INACTIVE");
  }

  return buildAuthenticatedSession(data.session, profile);
}

export async function logout(client: SupabaseClient) {
  const { error } = await client.auth.signOut();

  if (error) {
    throw authenticationError("AUTH_SESSION_INVALID");
  }

  return { signedOut: true };
}

export async function getSession(client: SupabaseClient, accessToken?: string): Promise<AuthenticatedSession> {
  const { data, error } = accessToken 
    ? await client.auth.getUser(accessToken) 
    : await client.auth.getUser();

  if (error || !data.user) {
    throw authenticationError("AUTH_SESSION_INVALID");
  }

  const profile = await fetchProfile(client, data.user.id);

  if (!profile.isActive) {
    throw authorizationError("AUTH_ACCOUNT_INACTIVE");
  }

  const { data: sessionData } = await client.auth.getSession();
  const session = sessionData.session;

  return {
    accessToken: accessToken ?? session?.access_token ?? "",
    refreshToken: session?.refresh_token ?? "",
    expiresAt: session?.expires_at ?? null,
    profile,
    requiresPasswordChange: profile.mustChangePassword,
  };
}

export async function requestPasswordReset(client: SupabaseClient, input: PasswordResetRequestInput) {
  const resetRequest = passwordResetRequestSchema.parse(input);
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

export async function changePassword(
  client: SupabaseClient,
  adminClient: SupabaseClient,
  input: ChangePasswordInput
) {
  const passwordChange = changePasswordSchema.parse(input);
  const { data: userData, error: userError } = await client.auth.getUser();

  if (userError || !userData.user) {
    throw authenticationError("AUTH_SESSION_INVALID");
  }

  const { error: updateError } = await client.auth.updateUser({
    password: passwordChange.newPassword,
  });

  if (updateError) {
    throw externalServiceError("EXTERNAL_SERVICE_ERROR", undefined, updateError);
  }

  await clearPasswordChangeRequirement(adminClient, userData.user.id);

  const profile = await fetchProfile(adminClient, userData.user.id);

  return {
    profile,
    requiresPasswordChange: false,
  };
}
