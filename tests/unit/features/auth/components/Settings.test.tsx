import { render as renderBare, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { BusinessProfile } from "@/features/business/types";
import { ApiError } from "@/lib/api/client";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";
import { authStub, TEST_PROFILE } from "@tests/support/auth";
import { Providers } from "@tests/support/providers";

const { auth, business, changeAvatar, resendConfirmation, resendEmailChange } = vi.hoisted(() => ({
  auth: { current: {} as ReturnType<typeof authStub> },
  business: { current: {} as { data?: BusinessProfile } },
  changeAvatar: vi.fn(),
  resendConfirmation: vi.fn(),
  resendEmailChange: vi.fn(),
}));
vi.mock("@/features/auth/AuthProvider", () => ({ useAuth: () => auth.current }));
vi.mock("@/features/auth/api.client", () => ({ AuthClient: { changeAvatar, resendConfirmation, resendEmailChange } }));
vi.mock("@/features/business/hooks/useBusiness", () => ({ useBusiness: () => business.current }));

const render = (ui: ReactElement) =>
  renderBare(ui, {
    wrapper: ({ children }) => (
      <ThemeProvider>
        <Providers>{children}</Providers>
      </ThemeProvider>
    ),
  });

const { Settings } = await import("@/features/auth/components/Settings");

const SWEET: BusinessProfile = {
  id: "b-1",
  name: "Sweet Delights",
  tagline: "Cakes for every celebration",
  city: "Pune",
  address: "12 MG Road",
  phone: "+919876543210",
  logoUrl: null,
  nameChangedAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  auth.current = authStub();
  business.current = { data: SWEET };
  vi.stubEnv("NEXT_PUBLIC_APP_VERSION", "0.1.0");
});

afterEach(() => vi.unstubAllEnvs());

const unconfirmed = () => authStub({ profile: { ...TEST_PROFILE, emailConfirmedAt: null } });

describe("Settings", () => {
  it("opens on who is signed in, for which business, and its catch phrase", () => {
    render(<Settings />);
    expect(screen.getByRole("heading", { level: 1, name: "Settings" })).toBeInTheDocument();
    const profile = screen.getByRole("region", { name: TEST_PROFILE.name });
    // The owner's picture, not their initials (the user, 2026-09-27).
    expect(within(profile).queryByText("AB")).not.toBeInTheDocument();
    const picture = within(profile).getByRole("button", { name: "Change profile picture" });
    expect(picture.querySelector("img")?.getAttribute("src")).toContain("husky");
    expect(within(profile).getByRole("heading", { name: TEST_PROFILE.name })).toBeInTheDocument();
    expect(within(profile).getByText("Owner · Sweet Delights")).toBeInTheDocument();
    expect(within(profile).getByText("“Cakes for every celebration”")).toBeInTheDocument();
  });

  it("names only the role until the business is read, and has no quote without a catch phrase", () => {
    business.current = {};
    const { rerender } = render(<Settings />);
    const profile = screen.getByRole("region", { name: TEST_PROFILE.name });
    expect(within(profile).getByText("Owner")).toBeInTheDocument();

    business.current = { data: { ...SWEET, tagline: null } };
    rerender(<Settings />);
    expect(within(profile).getByText("Owner · Sweet Delights")).toBeInTheDocument();
    expect(profile.querySelector("blockquote")).toBeNull();
  });

  it("opens the nine pictures to choose from when the picture is tapped", async () => {
    render(<Settings />);
    await userEvent.click(screen.getByRole("button", { name: "Change profile picture" }));
    const chooser = await screen.findByRole("dialog", { name: "Choose a profile picture" });
    expect(within(chooser).getAllByRole("radio")).toHaveLength(9);
    expect(within(chooser).getByRole("radio", { name: "Husky" })).toHaveAttribute("aria-checked", "true");

    await userEvent.click(within(chooser).getByRole("radio", { name: "Husky" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Choose a profile picture" })).not.toBeInTheDocument());
    expect(changeAvatar).not.toHaveBeenCalled();
  });

  it("goes to Business details", () => {
    render(<Settings />);
    const business = screen.getByRole("region", { name: "Business" });
    expect(within(business).getByRole("link", { name: /^Business details/ })).toHaveAttribute("href", "/business");
  });

  it("shows how the owner signs in, and where the password is changed", () => {
    render(<Settings />);
    const account = screen.getByRole("region", { name: "Account" });
    expect(within(account).getByRole("button", { name: `Name ${TEST_PROFILE.name}` })).toBeInTheDocument();
    expect(within(account).getByRole("button", { name: "Sign-in number +91 98765 43210" })).toBeInTheDocument();
    expect(within(account).getByRole("button", { name: `Email address ${TEST_PROFILE.email}` })).toBeInTheDocument();
    expect(account).toHaveTextContent("can each be changed once every 30 days");
    expect(within(account).getByRole("link", { name: /^Change password/ })).toHaveAttribute("href", "/change-password");
  });

  it("opens the sheet for the detail tapped", async () => {
    render(<Settings />);
    await userEvent.click(screen.getByRole("button", { name: /^Sign-in number/ }));
    expect(await screen.findByRole("dialog", { name: "Change sign-in number" })).toBeInTheDocument();
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("says when a detail changed within 30 days opens again, and does not offer it until then", () => {
    auth.current = authStub({
      profile: { ...TEST_PROFILE, nameChangedAt: new Date(Date.now() - 86_400_000).toISOString() },
    });
    render(<Settings />);
    const account = screen.getByRole("region", { name: "Account" });
    expect(within(account).queryByRole("button", { name: /^Name/ })).not.toBeInTheDocument();
    expect(account).toHaveTextContent(/You can change this again on \d{1,2} \w{3} \d{4}\./);
    expect(within(account).getByRole("button", { name: /^Email address/ })).toBeInTheDocument();
  });

  it("shows a new email waiting for its link, and sends the link again", async () => {
    resendEmailChange.mockResolvedValue({ queued: true });
    auth.current = authStub({ profile: { ...TEST_PROFILE, pendingEmail: "asha.new@example.com" } });
    render(<Settings />);
    const account = screen.getByRole("region", { name: "Account" });
    expect(account).toHaveTextContent("Confirm asha.new@example.com with the link sent to it.");

    await userEvent.click(within(account).getByRole("button", { name: "Send the link again" }));
    await waitFor(() => expect(resendEmailChange).toHaveBeenCalledOnce());
    expect(await screen.findByRole("status")).toHaveTextContent("A new link is on its way to asha.new@example.com.");
  });

  it("shows a link that could not be sent again on a card", async () => {
    resendEmailChange.mockRejectedValue(new ApiError(400, "AUTH_NO_PENDING_EMAIL", "There is no new email address waiting to be confirmed.", "req_9"));
    auth.current = authStub({ profile: { ...TEST_PROFILE, pendingEmail: "asha.new@example.com" } });
    render(<Settings />);
    await userEvent.click(screen.getByRole("button", { name: "Send the link again" }));
    expect(await screen.findByRole("alertdialog", { name: "Email not sent" })).toHaveTextContent("There is no new email address");
  });

  it("chooses the theme under Appearance", async () => {
    render(<Settings />);
    const appearance = screen.getByRole("region", { name: "Appearance" });
    await userEvent.click(within(appearance).getByRole("radio", { name: "Peach" }));
    expect(document.documentElement.getAttribute("data-theme")).toBe("peach");
    expect(appearance).toHaveTextContent("Kept on this device.");
  });

  it("says which version this is, and who made it", () => {
    render(<Settings />);
    const about = screen.getByRole("region", { name: "About" });
    expect(within(about).getByText("Version").closest("li")).toHaveTextContent("0.1.0");
    expect(within(about).getByText("Crafted by").closest("li")).toHaveTextContent("jaFFa");
    expect(about).not.toHaveTextContent("Vecteezy");
  });

  it("signs out", async () => {
    render(<Settings />);
    await userEvent.click(screen.getByRole("button", { name: /^Sign out/ }));
    await userEvent.click(
      within(screen.getByRole("alertdialog", { name: "Sign out?" })).getByRole("button", { name: "Sign out" }),
    );
    expect(auth.current.signOut).toHaveBeenCalledOnce();
  });

  it("says when an email address is still unconfirmed, and keeps quiet once it is", () => {
    auth.current = unconfirmed();
    const { rerender } = render(<Settings />);
    expect(screen.getByRole("alert")).toHaveTextContent(/not confirmed/i);

    auth.current = authStub();
    rerender(<Settings />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Resend confirmation" })).not.toBeInTheDocument();
  });

  it("sends the confirmation again, and says where it went (BUG-16)", async () => {
    resendConfirmation.mockResolvedValue({ queued: true });
    auth.current = unconfirmed();
    render(<Settings />);

    await userEvent.click(screen.getByRole("button", { name: "Resend confirmation" }));

    await waitFor(() => expect(resendConfirmation).toHaveBeenCalledOnce());
    expect(await screen.findByRole("status")).toHaveTextContent(`A new link is on its way to ${TEST_PROFILE.email}.`);
  });

  it("shows a refused resend on a card, with its reference", async () => {
    resendConfirmation.mockRejectedValue(
      new ApiError(409, "AUTH_EMAIL_ALREADY_CONFIRMED", "Your email address is already confirmed.", "req_3"),
    );
    auth.current = unconfirmed();
    render(<Settings />);

    await userEvent.click(screen.getByRole("button", { name: "Resend confirmation" }));

    const card = await screen.findByRole("alertdialog", { name: "Email not sent" });
    expect(card).toHaveTextContent("Your email address is already confirmed.");
    expect(card).toHaveTextContent("Reference: req_3");
  });

  it("shows nothing when nobody is signed in", () => {
    auth.current = authStub({ status: "anonymous", profile: null });
    render(<Settings />);
    expect(screen.queryByRole("heading", { name: "Settings" })).not.toBeInTheDocument();
  });
});
