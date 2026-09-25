import { render as renderBare, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/client";
import { authStub, TEST_PROFILE } from "@tests/support/auth";
import { Providers } from "@tests/support/providers";

const { auth, resendConfirmation } = vi.hoisted(() => ({
  auth: { current: {} as ReturnType<typeof authStub> },
  resendConfirmation: vi.fn(),
}));
vi.mock("@/features/auth/AuthProvider", () => ({ useAuth: () => auth.current }));
vi.mock("@/features/auth/api.client", () => ({ AuthClient: { resendConfirmation } }));

const render = (ui: ReactElement) => renderBare(ui, { wrapper: Providers });

const { AccountSummary } = await import("@/features/auth/components/AccountSummary");

beforeEach(() => {
  vi.clearAllMocks();
  auth.current = authStub();
});

const unconfirmed = () => authStub({ profile: { ...TEST_PROFILE, emailConfirmedAt: null } });

describe("the account on the settings screen", () => {
  it("shows how the owner signs in", () => {
    render(<AccountSummary />);

    expect(screen.getByText(TEST_PROFILE.name)).toBeInTheDocument();
    expect(screen.getByText(TEST_PROFILE.phone)).toBeInTheDocument();
    expect(screen.getByText(TEST_PROFILE.email)).toBeInTheDocument();
    expect(screen.getByText("Owner")).toBeInTheDocument();
  });

  it("offers the way to change a password without waiting for a reset", () => {
    render(<AccountSummary />);

    expect(screen.getByRole("link", { name: /change password/i })).toHaveAttribute(
      "href",
      "/change-password",
    );
  });

  it("says when an email address is still unconfirmed", () => {
    auth.current = unconfirmed();
    render(<AccountSummary />);

    expect(screen.getByRole("alert")).toHaveTextContent(/not confirmed/i);
  });

  it("keeps quiet once it is confirmed, and offers no resend", () => {
    render(<AccountSummary />);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Resend confirmation" })).not.toBeInTheDocument();
  });

  it("sends the confirmation again, and says where it went (BUG-16)", async () => {
    resendConfirmation.mockResolvedValue({ queued: true });
    auth.current = unconfirmed();
    render(<AccountSummary />);

    await userEvent.click(screen.getByRole("button", { name: "Resend confirmation" }));

    await waitFor(() => expect(resendConfirmation).toHaveBeenCalledOnce());
    expect(await screen.findByRole("status")).toHaveTextContent(`A new link is on its way to ${TEST_PROFILE.email}.`);
  });

  it("shows a refused resend on a card, with its reference", async () => {
    resendConfirmation.mockRejectedValue(
      new ApiError(409, "AUTH_EMAIL_ALREADY_CONFIRMED", "Your email address is already confirmed.", "req_3"),
    );
    auth.current = unconfirmed();
    render(<AccountSummary />);

    await userEvent.click(screen.getByRole("button", { name: "Resend confirmation" }));

    const card = await screen.findByRole("alertdialog", { name: "Email not sent" });
    expect(card).toHaveTextContent("Your email address is already confirmed.");
    expect(card).toHaveTextContent("Reference: req_3");
  });

  it("shows nothing when nobody is signed in", () => {
    auth.current = authStub({ status: "anonymous", profile: null });
    const { container } = render(<AccountSummary />);

    // Only the response card's live region, which the providers bring.
    expect(container.querySelector("section")).not.toBeInTheDocument();
    expect(screen.queryByText(/your account/i)).not.toBeInTheDocument();
  });
});
