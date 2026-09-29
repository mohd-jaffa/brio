import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiRoutes } from "@/lib/query/keys";

import { AuthClient } from "@/features/auth/api.client";

const mockFetch = vi.fn();
global.fetch = mockFetch;

function answers(data: unknown) {
  mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data }) });
}

const session = { profile: { name: "Asha" }, requiresPasswordChange: false };

describe("AuthClient", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("signs in through the login endpoint", async () => {
    answers(session);

    await expect(AuthClient.signIn({ phone: "9876543210", password: "hunter22" })).resolves.toEqual(session);
    expect(mockFetch).toHaveBeenCalledWith(apiRoutes.auth.login, expect.objectContaining({ method: "POST" }));
  });

  it("never hands a token back to the browser", async () => {
    answers(session);

    const result = await AuthClient.signIn({ phone: "9876543210", password: "hunter22" });

    expect(result).not.toHaveProperty("accessToken");
    expect(result).not.toHaveProperty("refreshToken");
  });

  it("registers an account", async () => {
    answers({ userId: "u-1", bakeryId: "b-1" });

    await expect(
      AuthClient.register({
        name: "Asha Baker",
        businessName: "Asha Bakes",
        phone: "9876543210",
        email: "asha@example.com",
        password: "hunter22",
        confirmPassword: "hunter22",
        city: "Pune",
        address: "12 MG Road",
      }),
    ).resolves.toEqual({ userId: "u-1", bakeryId: "b-1" });
    expect(mockFetch).toHaveBeenCalledWith(apiRoutes.auth.register, expect.objectContaining({ method: "POST" }));
  });

  it("asks for the confirmation email again", async () => {
    answers({ queued: true });

    await expect(AuthClient.resendConfirmation()).resolves.toEqual({ queued: true });
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/auth/resend-confirmation",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("asks for a temporary password", async () => {
    answers({ accepted: true });

    await AuthClient.requestPasswordReset({ email: "asha@example.com" });

    expect(mockFetch).toHaveBeenCalledWith(apiRoutes.auth.passwordReset, expect.objectContaining({ method: "POST" }));
  });

  it("changes a password with PATCH, as the route expects", async () => {
    answers(session);

    await AuthClient.changePassword({ newPassword: "hunter22", confirmPassword: "hunter22" });

    expect(mockFetch).toHaveBeenCalledWith(apiRoutes.auth.password, expect.objectContaining({ method: "PATCH" }));
  });

  it("confirms an email with the tokens from the link", async () => {
    answers(session);

    await AuthClient.confirmEmail({ accessToken: "a", refreshToken: "r" });

    expect(mockFetch).toHaveBeenCalledWith(
      apiRoutes.auth.confirm,
      expect.objectContaining({ method: "POST", body: JSON.stringify({ accessToken: "a", refreshToken: "r" }) }),
    );
  });

  it("signs out with no body to send", async () => {
    answers({ signedOut: true });

    await expect(AuthClient.signOut()).resolves.toEqual({ signedOut: true });
    expect(mockFetch).toHaveBeenCalledWith(
      apiRoutes.auth.logout,
      expect.objectContaining({ method: "POST", body: undefined }),
    );
  });

  it("reads the session", async () => {
    answers(session);

    await expect(AuthClient.getSession()).resolves.toEqual(session);
    expect(mockFetch).toHaveBeenCalledWith(apiRoutes.auth.session, expect.anything());
  });

  it("changes the owner's name and sign-in number with PATCH, and asks for a new email with POST", async () => {
    const profile = { name: "Asha B" };
    answers(profile);
    await expect(AuthClient.changeName({ name: "Asha B" })).resolves.toEqual(profile);
    expect(mockFetch).toHaveBeenLastCalledWith(apiRoutes.auth.name, expect.objectContaining({ method: "PATCH" }));

    answers(profile);
    await AuthClient.changePhone({ phone: "9000022222", password: "hunter22" });
    expect(mockFetch).toHaveBeenLastCalledWith(
      apiRoutes.auth.phone,
      expect.objectContaining({ method: "PATCH", body: JSON.stringify({ phone: "9000022222", password: "hunter22" }) }),
    );

    answers(profile);
    await AuthClient.changeEmail({ email: "asha.new@example.com", password: "hunter22" });
    expect(mockFetch).toHaveBeenLastCalledWith(apiRoutes.auth.email, expect.objectContaining({ method: "POST" }));
  });

  it("changes the profile picture with PATCH", async () => {
    answers({ avatar: "tiger" });
    await expect(AuthClient.changeAvatar({ avatar: "tiger" })).resolves.toEqual({ avatar: "tiger" });
    expect(mockFetch).toHaveBeenLastCalledWith(
      apiRoutes.auth.avatar,
      expect.objectContaining({ method: "PATCH", body: JSON.stringify({ avatar: "tiger" }) }),
    );
  });

  it("sends a new email's link again, and confirms it with the token from the link", async () => {
    answers({ queued: true });
    await expect(AuthClient.resendEmailChange()).resolves.toEqual({ queued: true });
    expect(mockFetch).toHaveBeenLastCalledWith(apiRoutes.auth.emailResend, expect.objectContaining({ method: "POST" }));

    answers({ email: "asha.new@example.com" });
    await expect(AuthClient.confirmEmailChange("the-token")).resolves.toEqual({ email: "asha.new@example.com" });
    expect(mockFetch).toHaveBeenLastCalledWith(
      apiRoutes.auth.emailConfirm,
      expect.objectContaining({ method: "POST", body: JSON.stringify({ token: "the-token" }) }),
    );
  });

  it("deletes the account with DELETE, sending what the owner typed", async () => {
    const confirmation = {
      phone: "9876543210",
      email: "asha@example.com",
      password: "Password123!",
      confirmPassword: "Password123!",
    };
    answers({ deleted: true });
    await expect(AuthClient.deleteAccount(confirmation)).resolves.toEqual({ deleted: true });
    expect(mockFetch).toHaveBeenLastCalledWith(
      apiRoutes.auth.account,
      expect.objectContaining({ method: "DELETE", body: JSON.stringify(confirmation) }),
    );
  });

  it("surfaces the server's own wording when a sign-in is refused", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({
        error: { code: "AUTH_INVALID_CREDENTIALS", message: "The phone number or password is incorrect." },
      }),
    });

    await expect(AuthClient.signIn({ phone: "9876543210", password: "wrong" })).rejects.toThrow(
      "The phone number or password is incorrect.",
    );
  });
});
