import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { UI_TEXT } from "@/constants/messages";
import { authStub } from "@tests/support/auth";
import { Providers } from "@tests/support/providers";

const { auth } = vi.hoisted(() => ({ auth: { current: {} as ReturnType<typeof authStub> } }));
vi.mock("@/features/auth/AuthProvider", () => ({ useAuth: () => auth.current }));

const { AccountMenu } = await import("@/features/auth/components/AccountMenu");

beforeEach(() => {
  vi.clearAllMocks();
  auth.current = authStub();
});

const agree = () =>
  userEvent.click(within(screen.getByRole("alertdialog", { name: "Sign out?" })).getByRole("button", { name: "Sign out" }));

describe("the account menu", () => {
  it("says which account is signed in, and in what role", () => {
    render(<AccountMenu />, { wrapper: Providers });

    expect(screen.getByText("Asha Baker")).toBeInTheDocument();
    expect(screen.getByText("Owner")).toBeInTheDocument();
  });

  it("signs the baker out, once they say so", async () => {
    render(<AccountMenu />, { wrapper: Providers });

    await userEvent.click(screen.getByRole("button", { name: UI_TEXT.auth.signOut }));
    expect(auth.current.signOut).not.toHaveBeenCalled();
    await agree();

    expect(auth.current.signOut).toHaveBeenCalled();
  });

  it("closes whatever it was opened from, so the sheet is not left over the sign-in screen", async () => {
    const onSignedOut = vi.fn();
    render(<AccountMenu onSignedOut={onSignedOut} />, { wrapper: Providers });

    await userEvent.click(screen.getByRole("button", { name: UI_TEXT.auth.signOut }));
    await agree();

    expect(onSignedOut).toHaveBeenCalled();
  });

  it("shows nothing at all when nobody is signed in", () => {
    auth.current = authStub({ status: "anonymous", profile: null });
    const { container } = render(
      <Providers>
        <div data-testid="menu">
          <AccountMenu />
        </div>
      </Providers>,
    );

    expect(container.querySelector("[data-testid=menu]")).toBeEmptyDOMElement();
  });
});
