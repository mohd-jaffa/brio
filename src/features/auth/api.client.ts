import { fetcher } from "@/lib/api/client";
import {
  type LoginInput,
  type RegisterInput,
  type PasswordResetRequestInput,
} from "@/lib/validation";
import { type AuthenticatedSession } from "./types";

export const AuthClient = {
  async login(payload: LoginInput): Promise<AuthenticatedSession> {
    return fetcher<AuthenticatedSession>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async register(payload: RegisterInput): Promise<{ userId: string; bakeryId: string }> {
    return fetcher<{ userId: string; bakeryId: string }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async requestPasswordReset(payload: PasswordResetRequestInput): Promise<{ accepted: boolean }> {
    return fetcher<{ accepted: boolean }>("/api/auth/password-reset", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async logout(): Promise<{ signedOut: boolean }> {
    return fetcher<{ signedOut: boolean }>("/api/auth/logout", {
      method: "POST",
    });
  },

  async getSession(): Promise<AuthenticatedSession> {
    return fetcher<AuthenticatedSession>("/api/auth/session");
  },
};
