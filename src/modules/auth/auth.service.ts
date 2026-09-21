import { type Session, type SupabaseClient } from "@supabase/supabase-js";
import { getServerEnv, type ServerEnv } from "@/infrastructure/env/server";
import { createConfiguredMailService } from "@/infrastructure/mail/nodemailer.provider";
import { type MailService } from "@/infrastructure/mail/mail.service";
import {
  createSupabaseAnonClient,
  createSupabaseServiceRoleClient,
} from "@/infrastructure/supabase/server";
import { ERROR_CODES } from "@/shared/constants/errors";
import {
  AuthenticationError,
  AuthorizationError,
  ConflictError,
  ExternalServiceError,
  InternalServerError,
} from "@/shared/errors/app-error";
import { logger } from "@/shared/logging/logger";
import { generateTemporaryPassword } from "@/modules/auth/auth.security";
import { AuthRepository, type ProfileRow } from "@/modules/auth/auth.repository";
import {
  changePasswordSchema,
  loginSchema,
  passwordResetRequestSchema,
  registerSchema,
  type ChangePasswordInput,
  type LoginInput,
  type PasswordResetRequestInput,
  type RegisterInput,
} from "@/modules/auth/auth.validation";
import { type AuthenticatedSession, type AuthProfile } from "@/modules/auth/auth.types";

type SupabaseFactory = (accessToken?: string) => SupabaseClient;
type MailServiceFactory = () => MailService;

interface AuthServiceDependencies {
  createAnonClient?: SupabaseFactory;
  createAdminClient?: () => SupabaseClient;
  createMailService?: MailServiceFactory;
  getEnv?: () => ServerEnv;
}

export class AuthService {
  private readonly createAnonClient: SupabaseFactory;
  private readonly createAdminClient: () => SupabaseClient;
  private readonly createMailService: MailServiceFactory;
  private readonly getEnv: () => ServerEnv;

  constructor(dependencies: AuthServiceDependencies = {}) {
    this.createAnonClient = dependencies.createAnonClient ?? createSupabaseAnonClient;
    this.createAdminClient = dependencies.createAdminClient ?? createSupabaseServiceRoleClient;
    this.createMailService = dependencies.createMailService ?? createConfiguredMailService;
    this.getEnv = dependencies.getEnv ?? getServerEnv;
  }

  async register(input: RegisterInput) {
    const registration = registerSchema.parse(input);
    const admin = this.createAdminClient();
    const env = this.getEnv();
    const repository = new AuthRepository(admin);

    const { data: userData, error: userError } = await admin.auth.admin.createUser({
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
      throw this.mapAuthMutationError(userError);
    }

    const user = userData.user;
    if (!user) {
      throw new InternalServerError();
    }

    try {
      const { bakeryId, profile } = await repository.createBakeryAndProfile({
        userId: user.id,
        businessName: registration.businessName,
        phone: registration.phone,
        email: registration.email,
        name: registration.name,
      });

      const confirmationUrl = await this.createConfirmationUrl(admin, registration.email, env);
      await this.createMailService().sendAccountConfirmation({
        to: registration.email,
        name: registration.name,
        confirmationUrl,
      });

      return {
        userId: user.id,
        bakeryId,
        profile: this.mapProfile(profile),
      };
    } catch (error) {
      await this.rollbackCreatedUser(admin, user.id);
      throw error;
    }
  }

  async login(input: LoginInput): Promise<AuthenticatedSession> {
    const credentials = loginSchema.parse(input);
    const supabase = this.createAnonClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      phone: credentials.phone,
      password: credentials.password,
    });

    if (error || !data.session || !data.user) {
      throw new AuthenticationError(ERROR_CODES.AUTH_INVALID_CREDENTIALS);
    }

    const profile = await this.fetchProfile(data.user.id);

    if (!profile.isActive) {
      throw new AuthorizationError(ERROR_CODES.AUTH_ACCOUNT_INACTIVE);
    }

    return this.buildAuthenticatedSession(data.session, profile);
  }

  async logout(accessToken: string) {
    const supabase = this.createAnonClient(accessToken);
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw new AuthenticationError(ERROR_CODES.AUTH_SESSION_INVALID);
    }

    return { signedOut: true };
  }

  async getSession(accessToken: string): Promise<AuthenticatedSession> {
    const supabase = this.createAnonClient(accessToken);
    const { data, error } = await supabase.auth.getUser(accessToken);

    if (error || !data.user) {
      throw new AuthenticationError(ERROR_CODES.AUTH_SESSION_INVALID);
    }

    const profile = await this.fetchProfile(data.user.id);

    if (!profile.isActive) {
      throw new AuthorizationError(ERROR_CODES.AUTH_ACCOUNT_INACTIVE);
    }

    return {
      accessToken,
      refreshToken: "",
      expiresAt: null,
      profile,
      requiresPasswordChange: profile.mustChangePassword,
    };
  }

  async requestPasswordReset(input: PasswordResetRequestInput) {
    const resetRequest = passwordResetRequestSchema.parse(input);
    const admin = this.createAdminClient();
    const repository = new AuthRepository(admin);

    const profile = await repository.getProfileByEmail(resetRequest.email);

    if (!profile || !profile.is_active) {
      return { accepted: true };
    }

    const temporaryPassword = generateTemporaryPassword();
    const { error: updateUserError } = await admin.auth.admin.updateUserById(profile.id, {
      password: temporaryPassword,
    });

    if (updateUserError) {
      throw new ExternalServiceError(ERROR_CODES.EXTERNAL_SERVICE_ERROR, undefined, updateUserError);
    }

    await repository.requirePasswordChange(profile.id);

    await this.createMailService().sendPasswordResetTemporaryPassword({
      to: profile.email,
      name: profile.name,
      temporaryPassword,
    });

    return { accepted: true };
  }

  async changePassword(accessToken: string, input: ChangePasswordInput) {
    const passwordChange = changePasswordSchema.parse(input);
    const supabase = this.createAnonClient(accessToken);
    const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);

    if (userError || !userData.user) {
      throw new AuthenticationError(ERROR_CODES.AUTH_SESSION_INVALID);
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: passwordChange.newPassword,
    });

    if (updateError) {
      throw new ExternalServiceError(ERROR_CODES.EXTERNAL_SERVICE_ERROR, undefined, updateError);
    }

    const admin = this.createAdminClient();
    const repository = new AuthRepository(admin);
    
    await repository.clearPasswordChangeRequirement(userData.user.id);

    const profile = await this.fetchProfile(userData.user.id);

    return {
      profile,
      requiresPasswordChange: false,
    };
  }

  private async fetchProfile(userId: string): Promise<AuthProfile> {
    const admin = this.createAdminClient();
    const repository = new AuthRepository(admin);
    const profile = await repository.getProfileById(userId);

    if (!profile) {
      throw new AuthenticationError(ERROR_CODES.AUTH_SESSION_INVALID);
    }

    return this.mapProfile(profile);
  }

  private mapProfile(row: ProfileRow): AuthProfile {
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

  private buildAuthenticatedSession(session: Session, profile: AuthProfile): AuthenticatedSession {
    return {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: session.expires_at ?? null,
      profile,
      requiresPasswordChange: profile.mustChangePassword,
    };
  }

  private async createConfirmationUrl(
    admin: SupabaseClient,
    email: string,
    env: ServerEnv,
  ) {
    const { data, error } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: {
        redirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/confirm`,
      },
    });

    if (error || !data.properties?.action_link) {
      throw new ExternalServiceError(ERROR_CODES.EXTERNAL_SERVICE_ERROR, undefined, error);
    }

    return data.properties.action_link;
  }

  private async rollbackCreatedUser(admin: SupabaseClient, userId: string) {
    const { error } = await admin.auth.admin.deleteUser(userId);

    if (error) {
      logger.error("Failed to roll back auth user after registration failure", {
        userId,
        error,
      });
    }
  }

  private mapAuthMutationError(error: unknown) {
    const message =
      error && typeof error === "object" && "message" in error
        ? String((error as { message: unknown }).message).toLowerCase()
        : "";

    if (message.includes("phone")) {
      return new ConflictError(ERROR_CODES.AUTH_PHONE_ALREADY_EXISTS);
    }

    if (message.includes("email")) {
      return new ConflictError(ERROR_CODES.AUTH_EMAIL_ALREADY_EXISTS);
    }

    if (message.includes("duplicate") || message.includes("unique")) {
      return new ConflictError();
    }

    return new ExternalServiceError(ERROR_CODES.EXTERNAL_SERVICE_ERROR, undefined, error);
  }
}

export function createAuthService(dependencies?: AuthServiceDependencies) {
  return new AuthService(dependencies);
}
