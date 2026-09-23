import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ERROR_MESSAGES, UI_TEXT } from "@/constants/messages";
import { authStub } from "@/test-utils/auth";

const { router, client, auth } = vi.hoisted(() => ({
  router: { replace: vi.fn(), push: vi.fn(), back: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() },
  client: { confirmEmail: vi.fn() },
  auth: { current: {} as ReturnType<typeof authStub> },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/confirm-email",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("../api.client", () => ({ AuthClient: client }));
vi.mock("../AuthProvider", () => ({ useAuth: () => auth.current }));

const { ConfirmEmailPanel, readConfirmationLink } = await import("./ConfirmEmailPanel");

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
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/"));
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
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("says it is working while it waits", () => {
    window.location.hash = "#access_token=a&refresh_token=r";
    render(<ConfirmEmailPanel />);

    expect(screen.getByRole("status")).toHaveTextContent(UI_TEXT.auth.confirming);
  });
});
