import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ERROR_MESSAGES, UI_TEXT } from "@/constants/messages";
import { authStub } from "@tests/support/auth";

const { router, client, auth } = vi.hoisted(() => ({
  router: { replace: vi.fn(), push: vi.fn(), back: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() },
  client: { confirmEmail: vi.fn(), confirmEmailChange: vi.fn() },
  auth: { current: {} as ReturnType<typeof authStub> },
}));

// Signing in, out, or confirming an email loads a new page: nothing of the last account stays.
const { loadPage } = vi.hoisted(() => ({ loadPage: vi.fn() }));
vi.mock("@/lib/navigation/url", () => ({ loadPage }));
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/confirm-email",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/features/auth/api.client", () => ({ AuthClient: client }));
vi.mock("@/features/auth/AuthProvider", () => ({ useAuth: () => auth.current }));

const { ConfirmEmailPanel, readConfirmationLink, readEmailChangeToken } = await import(
  "@/features/auth/components/ConfirmEmailPanel"
);

beforeEach(() => {
  vi.clearAllMocks();
  auth.current = authStub();
  client.confirmEmail.mockResolvedValue({ profile: {}, requiresPasswordChange: false });
});

afterEach(() => {
  window.location.hash = "";
});

describe("reading a confirmation link", () => {
  it("finds the tokens Supabase put in the fragment", () => {
    expect(readConfirmationLink("#access_token=a&refresh_token=r&type=magiclink")).toEqual({
      link: { accessToken: "a", refreshToken: "r" },
    });
  });

  it("recognises a link that has expired or already been used", () => {
    expect(readConfirmationLink("#error=access_denied&error_code=otp_expired")).toEqual({
      link: null,
      expired: true,
    });
  });

  it("recognises the page being opened with no link at all", () => {
    expect(readConfirmationLink("")).toEqual({ link: null, expired: false });
  });

  it("will not take half a link", () => {
    expect(readConfirmationLink("#access_token=a")).toEqual({ link: null, expired: false });
  });
});

describe("confirming an email address", () => {
  it("hands the tokens over and signs the baker in", async () => {
    window.location.hash = "#access_token=a&refresh_token=r";
    render(<ConfirmEmailPanel />);

    await waitFor(() =>
      expect(client.confirmEmail).toHaveBeenCalledWith({ accessToken: "a", refreshToken: "r" }),
    );
    await waitFor(() => expect(auth.current.adopt).toHaveBeenCalled());
    await waitFor(() => expect(loadPage).toHaveBeenCalledWith("/"));
  });

  it("wipes the tokens out of the address bar before anything else", async () => {
    window.location.hash = "#access_token=a&refresh_token=r";
    render(<ConfirmEmailPanel />);

    await waitFor(() => expect(window.location.hash).toBe(""));
  });

  it("explains a link that has expired instead of failing silently", async () => {
    window.location.hash = "#error=access_denied&error_code=otp_expired";
    render(<ConfirmEmailPanel />);

    expect(await screen.findByText(ERROR_MESSAGES.AUTH_EMAIL_CONFIRM_FAILED)).toBeInTheDocument();
    expect(client.confirmEmail).not.toHaveBeenCalled();
  });

  it("says where the page is meant to be opened from when it is reached directly", async () => {
    render(<ConfirmEmailPanel />);

    expect(await screen.findByText(UI_TEXT.auth.confirmLinkMissing)).toBeInTheDocument();
  });

  it("offers the way back to sign-in when it cannot confirm", async () => {
    render(<ConfirmEmailPanel />);

    expect(await screen.findByRole("link", { name: UI_TEXT.auth.backToSignIn })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  it("reports a refusal from the server in its own words", async () => {
    window.location.hash = "#access_token=a&refresh_token=r";
    client.confirmEmail.mockRejectedValue(
      Object.assign(new Error(ERROR_MESSAGES.AUTH_EMAIL_CONFIRM_FAILED), {
        code: "AUTH_EMAIL_CONFIRM_FAILED",
      }),
    );
    render(<ConfirmEmailPanel />);

    expect(await screen.findByText(ERROR_MESSAGES.AUTH_EMAIL_CONFIRM_FAILED)).toBeInTheDocument();
    expect(loadPage).not.toHaveBeenCalled();
  });

  it("says it is working while it waits", () => {
    window.location.hash = "#access_token=a&refresh_token=r";
    render(<ConfirmEmailPanel />);

    expect(screen.getByRole("status")).toHaveTextContent(UI_TEXT.auth.confirming);
  });
});

describe("confirming a new email address", () => {
  it("finds the token in the fragment, and nothing in any other link", () => {
    expect(readEmailChangeToken("#change=the-token")).toBe("the-token");
    expect(readEmailChangeToken("#access_token=a&refresh_token=r")).toBeNull();
  });

  it("hands the token over, reads the session again and says what the email is now", async () => {
    client.confirmEmailChange.mockResolvedValue({ email: "asha.new@example.com" });
    window.location.hash = "#change=the-token";
    render(<ConfirmEmailPanel />);

    expect(screen.getByText(UI_TEXT.auth.confirmingChange)).toBeInTheDocument();
    expect(await screen.findByText("Your email address is now asha.new@example.com.")).toBeInTheDocument();
    expect(client.confirmEmailChange).toHaveBeenCalledWith("the-token");
    expect(auth.current.reload).toHaveBeenCalledOnce();
    expect(client.confirmEmail).not.toHaveBeenCalled();
    expect(window.location.hash).toBe("");
    expect(screen.getByRole("link", { name: "Go to the app" })).toHaveAttribute("href", "/");
  });

  it("says a link that lapsed or was used, in the server's words", async () => {
    client.confirmEmailChange.mockRejectedValue(new Error("boom"));
    window.location.hash = "#change=old-token";
    render(<ConfirmEmailPanel />);
    expect(await screen.findByText(ERROR_MESSAGES.AUTH_EMAIL_CONFIRM_FAILED)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: UI_TEXT.auth.backToSignIn })).toBeInTheDocument();
  });

  it("does nothing once the page has gone", async () => {
    let finish: (value: { email: string }) => void = () => {};
    client.confirmEmailChange.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    window.location.hash = "#change=the-token";
    const { unmount } = render(<ConfirmEmailPanel />);
    unmount();
    finish({ email: "asha.new@example.com" });
    await waitFor(() => expect(auth.current.reload).not.toHaveBeenCalled());

    client.confirmEmailChange.mockReturnValue(Promise.reject(new Error("late")));
    window.location.hash = "#change=the-token";
    render(<ConfirmEmailPanel />).unmount();
    await Promise.resolve();
  });
});

describe("a welcome link whose page has gone", () => {
  it("signs no one in once the page is closed, whether the server answers or refuses", async () => {
    let answer: (value: unknown) => void = () => {};
    client.confirmEmail.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    window.location.hash = "#access_token=a&refresh_token=r";
    render(<ConfirmEmailPanel />).unmount();
    answer({ profile: {}, requiresPasswordChange: false });
    await waitFor(() => expect(auth.current.adopt).not.toHaveBeenCalled());

    let refuse: (reason: unknown) => void = () => {};
    client.confirmEmail.mockReturnValue(new Promise((_, reject) => (refuse = reject)));
    window.location.hash = "#access_token=a&refresh_token=r";
    render(<ConfirmEmailPanel />).unmount();
    refuse(new Error("late"));
    await waitFor(() => expect(loadPage).not.toHaveBeenCalled());
  });
});
