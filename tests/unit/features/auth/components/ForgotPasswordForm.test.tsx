import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ERROR_MESSAGES, UI_TEXT, VALIDATION_MESSAGES } from "@/constants/messages";
import { Providers } from "@tests/support/providers";

const { client } = vi.hoisted(() => ({ client: { requestPasswordReset: vi.fn() } }));
vi.mock("@/features/auth/api.client", () => ({ AuthClient: client }));

const { ForgotPasswordForm } = await import("@/features/auth/components/ForgotPasswordForm");

const ask = () => screen.getByRole("button", { name: UI_TEXT.auth.sendResetEmail });

beforeEach(() => {
  vi.clearAllMocks();
  client.requestPasswordReset.mockResolvedValue({ accepted: true });
});

describe("asking for a temporary password", () => {
  it("asks for the address the account was registered with", () => {
    render(<ForgotPasswordForm />, { wrapper: Providers });

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
  });

  it("sends the address, lower-cased", async () => {
    render(<ForgotPasswordForm />, { wrapper: Providers });

    await userEvent.type(screen.getByLabelText(/email address/i), "ASHA@Example.com");
    await userEvent.click(ask());

    await waitFor(() =>
      expect(client.requestPasswordReset).toHaveBeenCalledWith({ email: "asha@example.com" }),
    );
  });

  it("will not send something that is not an address", async () => {
    render(<ForgotPasswordForm />, { wrapper: Providers });

    await userEvent.type(screen.getByLabelText(/email address/i), "asha");
    await userEvent.click(ask());

    expect(await screen.findByText(VALIDATION_MESSAGES.email("Email address"))).toBeInTheDocument();
    expect(client.requestPasswordReset).not.toHaveBeenCalled();
  });

  it("says the same thing whether or not the address has an account", async () => {
    render(<ForgotPasswordForm />, { wrapper: Providers });

    await userEvent.type(screen.getByLabelText(/email address/i), "nobody@example.com");
    await userEvent.click(ask());

    // A card with the one step that follows, since nothing is left to do here.
    const card = await screen.findByRole("dialog", { name: UI_TEXT.outcomes.resetEmailSent });
    expect(card).toHaveTextContent(UI_TEXT.auth.resetSent);
    expect(within(card).getByRole("link", { name: UI_TEXT.auth.backToSignIn })).toHaveAttribute("href", "/login");
  });

  it("says when the request could not be sent at all", async () => {
    client.requestPasswordReset.mockRejectedValue(new TypeError("Network down"));
    render(<ForgotPasswordForm />, { wrapper: Providers });

    await userEvent.type(screen.getByLabelText(/email address/i), "asha@example.com");
    await userEvent.click(ask());

    const card = await screen.findByRole("alertdialog", { name: UI_TEXT.outcomes.resetNotSent });
    expect(card).toHaveTextContent(ERROR_MESSAGES.AUTH_RESET_REQUEST_FAILED);
  });
});
