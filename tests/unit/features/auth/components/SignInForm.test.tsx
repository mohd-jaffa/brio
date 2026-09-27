import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ERROR_MESSAGES, UI_TEXT } from "@/constants/messages";
import { authStub } from "@tests/support/auth";
import { Providers } from "@tests/support/providers";

const { router, query, auth } = vi.hoisted(() => ({
  router: { replace: vi.fn(), push: vi.fn(), back: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() },
  query: { current: new URLSearchParams() },
  auth: { current: {} as ReturnType<typeof authStub> },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/login",
  useSearchParams: () => query.current,
}));
vi.mock("@/features/auth/AuthProvider", () => ({ useAuth: () => auth.current }));

const { SignInForm } = await import("@/features/auth/components/SignInForm");

beforeEach(() => {
  vi.clearAllMocks();
  query.current = new URLSearchParams();
  auth.current = authStub();
});

const signIn = () => screen.getByRole("button", { name: UI_TEXT.auth.signIn });

describe("signing in", () => {
  it("asks for the two things an account is identified by", () => {
    render(<SignInForm />, { wrapper: Providers });

    // A touch screen shows the digit pad: +91 is fixed, so + * # are never typed.
    expect(screen.getByLabelText(/mobile number/i)).toHaveAttribute("inputmode", "numeric");
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
  });

  it("says what is missing rather than sending an empty form", async () => {
    render(<SignInForm />, { wrapper: Providers });

    await userEvent.click(signIn());

    expect(await screen.findAllByRole("alert")).not.toHaveLength(0);
    expect(auth.current.signIn).not.toHaveBeenCalled();
  });

  it("sends the number in the form the account is stored under", async () => {
    render(<SignInForm />, { wrapper: Providers });

    await userEvent.type(screen.getByLabelText(/mobile number/i), "+91 98765-43210");
    await userEvent.type(screen.getByLabelText(/^password/i), "hunter22");
    await userEvent.click(signIn());

    await waitFor(() =>
      expect(auth.current.signIn).toHaveBeenCalledWith({
        phone: "+919876543210",
        password: "hunter22",
      }),
    );
  });

  it("says it is signing in while the answer is on its way", async () => {
    auth.current.signIn.mockReturnValue(new Promise(() => {}));
    render(<SignInForm />, { wrapper: Providers });

    await userEvent.type(screen.getByLabelText(/mobile number/i), "9876543210");
    await userEvent.type(screen.getByLabelText(/^password/i), "hunter22");
    await userEvent.click(signIn());

    expect(await screen.findByRole("button", { name: UI_TEXT.auth.signingIn })).toHaveAttribute("aria-busy", "true");
  });

  it("goes on to the dashboard once the session exists", async () => {
    render(<SignInForm />, { wrapper: Providers });

    await userEvent.type(screen.getByLabelText(/mobile number/i), "9876543210");
    await userEvent.type(screen.getByLabelText(/^password/i), "hunter22");
    await userEvent.click(signIn());

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/"));
  });

  it("returns to the screen the visitor was trying to reach", async () => {
    query.current = new URLSearchParams("next=%2Forders%2Fo-1");
    render(<SignInForm />, { wrapper: Providers });

    await userEvent.type(screen.getByLabelText(/mobile number/i), "9876543210");
    await userEvent.type(screen.getByLabelText(/^password/i), "hunter22");
    await userEvent.click(signIn());

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/orders/o-1"));
  });

  it("sends a baker holding a temporary password to replace it, and nowhere else", async () => {
    auth.current = authStub({
      signIn: vi.fn().mockResolvedValue({ profile: {}, requiresPasswordChange: true }),
    });
    render(<SignInForm />, { wrapper: Providers });

    await userEvent.type(screen.getByLabelText(/mobile number/i), "9876543210");
    await userEvent.type(screen.getByLabelText(/^password/i), "temp-pass");
    await userEvent.click(signIn());

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/change-password"));
  });

  it("shows why a sign-in was refused, in the server's own words", async () => {
    auth.current = authStub({
      signIn: vi.fn().mockRejectedValue(
        Object.assign(new Error(ERROR_MESSAGES.AUTH_INVALID_CREDENTIALS), {
          code: "AUTH_INVALID_CREDENTIALS",
        }),
      ),
    });
    render(<SignInForm />, { wrapper: Providers });

    await userEvent.type(screen.getByLabelText(/mobile number/i), "9876543210");
    await userEvent.type(screen.getByLabelText(/^password/i), "wrong-pass");
    await userEvent.click(signIn());

    expect(await screen.findByText(ERROR_MESSAGES.AUTH_INVALID_CREDENTIALS)).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("offers the way to a forgotten password", () => {
    render(<SignInForm />, { wrapper: Providers });

    expect(screen.getByRole("link", { name: UI_TEXT.auth.forgotPassword })).toHaveAttribute(
      "href",
      "/forgot-password",
    );
  });
});
