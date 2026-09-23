import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { UI_TEXT } from "@/constants/messages";
import { authStub } from "@/test-utils/auth";

const { auth } = vi.hoisted(() => ({ auth: { current: {} as ReturnType<typeof authStub> } }));
vi.mock("../AuthProvider", () => ({ useAuth: () => auth.current }));

const { AccountMenu } = await import("./AccountMenu");

beforeEach(() => {
  vi.clearAllMocks();
  auth.current = authStub();
});

describe("the account menu", () => {
  it("says which account is signed in, and in what role", () => {
    render(<AccountMenu />);

    expect(screen.getByText("Asha Baker")).toBeInTheDocument();
    expect(screen.getByText("Baker")).toBeInTheDocument();
  });

  it("signs the baker out", async () => {
    render(<AccountMenu />);

    await userEvent.click(screen.getByRole("button", { name: UI_TEXT.auth.signOut }));

    expect(auth.current.signOut).toHaveBeenCalled();
  });

  it("closes whatever it was opened from, so the sheet is not left over the sign-in screen", async () => {
    const onSignedOut = vi.fn();
    render(<AccountMenu onSignedOut={onSignedOut} />);

    await userEvent.click(screen.getByRole("button", { name: UI_TEXT.auth.signOut }));

    expect(onSignedOut).toHaveBeenCalled();
  });

  it("shows nothing at all when nobody is signed in", () => {
    auth.current = authStub({ status: "anonymous", profile: null });
    const { container } = render(<AccountMenu />);

    expect(container).toBeEmptyDOMElement();
  });
});
