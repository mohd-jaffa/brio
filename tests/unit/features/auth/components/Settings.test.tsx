import { render as renderBare, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { BusinessProfile } from "@/features/business/types";
import { ApiError } from "@/lib/api/client";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";
import { authStub, TEST_PROFILE } from "@tests/support/auth";
import { Providers } from "@tests/support/providers";

const { auth, business, resendConfirmation } = vi.hoisted(() => ({
  auth: { current: {} as ReturnType<typeof authStub> },
  business: { current: {} as { data?: BusinessProfile } },
  resendConfirmation: vi.fn(),
}));
vi.mock("@/features/auth/AuthProvider", () => ({ useAuth: () => auth.current }));
vi.mock("@/features/auth/api.client", () => ({ AuthClient: { resendConfirmation } }));
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
    expect(within(profile).getByText("AB")).toBeInTheDocument();
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

  it("goes to Business details", () => {
    render(<Settings />);
    const business = screen.getByRole("region", { name: "Business" });
    expect(within(business).getByRole("link", { name: /^Business details/ })).toHaveAttribute("href", "/business");
  });

  it("shows how the owner signs in, and where the password is changed", () => {
    render(<Settings />);
    const account = screen.getByRole("region", { name: "Account" });
    expect(within(account).getByText(TEST_PROFILE.name)).toBeInTheDocument();
    expect(within(account).getByText("+91 98765 43210")).toBeInTheDocument();
    expect(within(account).getByText(TEST_PROFILE.email)).toBeInTheDocument();
    expect(within(account).getByRole("link", { name: /^Change password/ })).toHaveAttribute("href", "/change-password");
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
