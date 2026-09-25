import { fetcher, postJson } from "@/lib/api/client";
import { apiRoutes } from "@/lib/query/keys";
import type {
  ChangePasswordInput,
  ConfirmEmailInput,
  LoginInput,
  PasswordResetRequestInput,
  RegisterInput,
} from "@/lib/validation";

import type { AuthSessionView } from "./types";

export interface RegisteredAccount {
  userId: string;
  bakeryId: string;
}

/**
 * The authentication endpoints the browser calls. None of them takes or
 * returns a token: signing in sets HttpOnly cookies the browser carries by
 * itself, and what comes back is the profile and whether a password change is
 * owed (AGENTS.md §9).
 */
export const AuthClient = {
  signIn: (payload: LoginInput) => postJson<AuthSessionView>(apiRoutes.auth.login, payload),

  register: (payload: RegisterInput) =>
    postJson<RegisteredAccount>(apiRoutes.auth.register, payload),

  requestPasswordReset: (payload: PasswordResetRequestInput) =>
    postJson<{ accepted: boolean }>(apiRoutes.auth.passwordReset, payload),

  changePassword: (payload: ChangePasswordInput) =>
    fetcher<AuthSessionView>(apiRoutes.auth.password, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  confirmEmail: (payload: ConfirmEmailInput) =>
    postJson<AuthSessionView>(apiRoutes.auth.confirm, payload),

  resendConfirmation: () => postJson<{ queued: boolean }>(apiRoutes.auth.resendConfirmation),

  signOut: () => postJson<{ signedOut: boolean }>(apiRoutes.auth.logout),

  getSession: () => fetcher<AuthSessionView>(apiRoutes.auth.session),
};
