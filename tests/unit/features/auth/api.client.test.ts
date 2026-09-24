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

    await expect(AuthClient.signIn({ phone: "9876543210", password: "hunter22" })).resolves.toEqual(
      session,
    );
    expect(mockFetch).toHaveBeenCalledWith(
      apiRoutes.auth.login,
      expect.objectContaining({ method: "POST" }),
    );
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
      }),
    ).resolves.toEqual({ userId: "u-1", bakeryId: "b-1" });
    expect(mockFetch).toHaveBeenCalledWith(
      apiRoutes.auth.register,
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("asks for a temporary password", async () => {
    answers({ accepted: true });

    await AuthClient.requestPasswordReset({ email: "asha@example.com" });

    expect(mockFetch).toHaveBeenCalledWith(
      apiRoutes.auth.passwordReset,
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("changes a password with PATCH, as the route expects", async () => {
    answers(session);

    await AuthClient.changePassword({ newPassword: "hunter22", confirmPassword: "hunter22" });

    expect(mockFetch).toHaveBeenCalledWith(
      apiRoutes.auth.password,
      expect.objectContaining({ method: "PATCH" }),
    );
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
