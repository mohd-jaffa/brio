import { fetcher, postJson } from "@/lib/api/client";
import { apiRoutes } from "@/lib/query/keys";
import type {
  ChangeAvatarInput,
  ChangeEmailInput,
  ChangeNameInput,
  ChangePasswordInput,
  ChangePhoneInput,
  ConfirmEmailInput,
  DeleteAccountInput,
  LoginInput,
  PasswordResetRequestInput,
  RegisterInput,
} from "@/lib/validation";

import type { AuthProfile, AuthSessionView } from "./types";

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

  /** The owner's own details, each once in 30 days (the user, 2026-09-26). */
  changeName: (payload: ChangeNameInput) =>
    fetcher<AuthProfile>(apiRoutes.auth.name, { method: "PATCH", body: JSON.stringify(payload) }),

  /** The profile picture, as often as the owner likes (the user, 2026-09-27). */
  changeAvatar: (payload: ChangeAvatarInput) =>
    fetcher<AuthProfile>(apiRoutes.auth.avatar, { method: "PATCH", body: JSON.stringify(payload) }),

  changePhone: (payload: ChangePhoneInput) =>
    fetcher<AuthProfile>(apiRoutes.auth.phone, { method: "PATCH", body: JSON.stringify(payload) }),

  /** A new email address, which waits for its confirmation. */
  changeEmail: (payload: ChangeEmailInput) => postJson<AuthProfile>(apiRoutes.auth.email, payload),

  resendEmailChange: () => postJson<{ queued: boolean }>(apiRoutes.auth.emailResend),

  confirmEmailChange: (token: string) => postJson<{ email: string }>(apiRoutes.auth.emailConfirm, { token }),

  /** The account and everything of its business, deleted for good (R8.10). */
  deleteAccount: (payload: DeleteAccountInput) =>
    fetcher<{ deleted: boolean }>(apiRoutes.auth.account, { method: "DELETE", body: JSON.stringify(payload) }),
};
