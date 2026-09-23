import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { authStub, TEST_PROFILE } from "@/test-utils/auth";

const { auth } = vi.hoisted(() => ({ auth: { current: {} as ReturnType<typeof authStub> } }));
vi.mock("../AuthProvider", () => ({ useAuth: () => auth.current }));

const { AccountSummary } = await import("./AccountSummary");

beforeEach(() => {
  auth.current = authStub();
});

describe("the account on the settings screen", () => {
  it("shows how the baker signs in", () => {
    render(<AccountSummary />);

    expect(screen.getByText(TEST_PROFILE.name)).toBeInTheDocument();
    expect(screen.getByText(TEST_PROFILE.phone)).toBeInTheDocument();
    expect(screen.getByText(TEST_PROFILE.email)).toBeInTheDocument();
    expect(screen.getByText("Baker")).toBeInTheDocument();
  });

  it("offers the way to change a password without waiting for a reset", () => {
    render(<AccountSummary />);

    expect(screen.getByRole("link", { name: /change password/i })).toHaveAttribute(
      "href",
      "/change-password",
    );
  });

  it("says when an email address is still unconfirmed", () => {
    auth.current = authStub({ profile: { ...TEST_PROFILE, emailConfirmedAt: null } });
    render(<AccountSummary />);

    expect(screen.getByRole("alert")).toHaveTextContent(/not confirmed/i);
  });

  it("keeps quiet once it is confirmed", () => {
    render(<AccountSummary />);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows nothing when nobody is signed in", () => {
    auth.current = authStub({ status: "anonymous", profile: null });
    const { container } = render(<AccountSummary />);

    expect(container).toBeEmptyDOMElement();
  });
});
