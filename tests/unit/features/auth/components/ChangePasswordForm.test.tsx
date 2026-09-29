import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ERROR_MESSAGES, UI_TEXT, VALIDATION_MESSAGES } from "@/constants/messages";
import { authStub } from "@tests/support/auth";
import { Providers } from "@tests/support/providers";

const { router, client, auth } = vi.hoisted(() => ({
  router: { replace: vi.fn(), push: vi.fn(), back: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() },
  client: { changePassword: vi.fn() },
  auth: { current: {} as ReturnType<typeof authStub> },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/change-password",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/features/auth/api.client", () => ({ AuthClient: client }));
vi.mock("@/features/auth/AuthProvider", () => ({ useAuth: () => auth.current }));

const { ChangePasswordForm } = await import("@/features/auth/components/ChangePasswordForm");

const save = () => screen.getByRole("button", { name: UI_TEXT.auth.setNewPassword });

beforeEach(() => {
  vi.clearAllMocks();
  auth.current = authStub({ requiresPasswordChange: true });
  client.changePassword.mockResolvedValue({ profile: {}, requiresPasswordChange: false });
});

async function type(password: string, confirmation = password) {
  await userEvent.type(screen.getByLabelText(/^new password/i), password);
  await userEvent.type(screen.getByLabelText(/^confirm password/i), confirmation);
}

describe("replacing a password", () => {
  it("posts if sent before the page has loaded, so nothing typed lands in the address", () => {
    render(<ChangePasswordForm />, { wrapper: Providers });
    const form = save().closest("form");
    expect(form).toHaveAttribute("method", "post");
    expect(form).not.toHaveAttribute("action");
  });

  it("says why a baker has been sent here", () => {
    render(<ChangePasswordForm />, { wrapper: Providers });

    expect(screen.getByText(UI_TEXT.auth.temporaryPasswordNotice)).toBeInTheDocument();
  });

  it("does not nag someone who came here of their own accord", () => {
    auth.current = authStub();
    render(<ChangePasswordForm />, { wrapper: Providers });

    expect(screen.queryByText(UI_TEXT.auth.temporaryPasswordNotice)).not.toBeInTheDocument();
  });

  it("will not set two different passwords", async () => {
    render(<ChangePasswordForm />, { wrapper: Providers });

    await type("hunter22", "hunter33");
    await userEvent.click(save());

    expect(await screen.findByText(VALIDATION_MESSAGES.passwordsMustMatch)).toBeInTheDocument();
    expect(client.changePassword).not.toHaveBeenCalled();
  });

  it("refuses one too short to be a password", async () => {
    render(<ChangePasswordForm />, { wrapper: Providers });

    await type("short");
    await userEvent.click(save());

    expect(await screen.findByText(VALIDATION_MESSAGES.tooShort("Password", 8))).toBeInTheDocument();
    expect(client.changePassword).not.toHaveBeenCalled();
  });

  it("sends the new password and takes the baker into the app", async () => {
    render(<ChangePasswordForm />, { wrapper: Providers });

    await type("hunter22");
    await userEvent.click(save());

    await waitFor(() =>
      expect(client.changePassword).toHaveBeenCalledWith({
        newPassword: "hunter22",
        confirmPassword: "hunter22",
      }),
    );
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/"));
  });

  it("takes up the session the change returned, so the gate is not still closed", async () => {
    render(<ChangePasswordForm />, { wrapper: Providers });

    await type("hunter22");
    await userEvent.click(save());

    await waitFor(() =>
      expect(auth.current.adopt).toHaveBeenCalledWith({ profile: {}, requiresPasswordChange: false }),
    );
  });

  it("says when the change did not go through, and stays put", async () => {
    client.changePassword.mockRejectedValue(new TypeError("Network down"));
    render(<ChangePasswordForm />, { wrapper: Providers });

    await type("hunter22");
    await userEvent.click(save());

    expect(await screen.findByText(ERROR_MESSAGES.AUTH_PASSWORD_CHANGE_FAILED)).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });
});
