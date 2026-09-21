import { type SupabaseClient } from "@supabase/supabase-js";
import { type UserRole } from "@/modules/auth/auth.types";
import { ConflictError, ExternalServiceError } from "@/shared/errors/app-error";
import { ERROR_CODES } from "@/shared/constants/errors";

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

export class AuthRepository {
  constructor(private readonly adminClient: SupabaseClient) {}

  async createBakeryAndProfile(input: {
    userId: string;
    businessName: string;
    phone: string;
    email: string;
    name: string;
  }) {
    // Note: Since Supabase js client doesn't support transactions across multiple tables
    // directly without RPC, we use a compensation-based approach here.

    // 1. Create Bakery
    const { data: bakeryData, error: bakeryError } = await this.adminClient
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
      throw this.mapDatabaseError(bakeryError);
    }

    const bakeryId = String((bakeryData as { id: string }).id);

    // 2. Create Profile
    const { data: profileData, error: profileError } = await this.adminClient
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
        "id, phone, email, name, role, bakery_id, is_active, must_change_password, email_confirmed_at",
      )
      .single();

    if (profileError || !profileData) {
      // Rollback bakery creation if profile fails
      await this.adminClient.from("bakeries").delete().eq("id", bakeryId);
      throw this.mapDatabaseError(profileError);
    }

    return {
      bakeryId,
      profile: profileData as ProfileRow,
    };
  }

  async getProfileById(userId: string): Promise<ProfileRow | null> {
    const { data, error } = await this.adminClient
      .from("profiles")
      .select(
        "id, phone, email, name, role, bakery_id, is_active, must_change_password, email_confirmed_at",
      )
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      throw this.mapDatabaseError(error);
    }

    return data as ProfileRow | null;
  }

  async getProfileByEmail(email: string): Promise<ProfileRow | null> {
    const { data, error } = await this.adminClient
      .from("profiles")
      .select(
        "id, phone, email, name, role, bakery_id, is_active, must_change_password, email_confirmed_at",
      )
      .eq("email", email)
      .maybeSingle();

    if (error) {
      throw this.mapDatabaseError(error);
    }

    return data as ProfileRow | null;
  }

  async requirePasswordChange(userId: string): Promise<void> {
    const { error } = await this.adminClient
      .from("profiles")
      .update({ must_change_password: true })
      .eq("id", userId);

    if (error) {
      throw this.mapDatabaseError(error);
    }
  }

  async clearPasswordChangeRequirement(userId: string): Promise<void> {
    const { error } = await this.adminClient
      .from("profiles")
      .update({ must_change_password: false })
      .eq("id", userId);

    if (error) {
      throw this.mapDatabaseError(error);
    }
  }

  private mapDatabaseError(error: unknown) {
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
