import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { UI_TEXT } from "@/constants/messages";
import { authStub } from "@tests/support/auth";

const { router, auth } = vi.hoisted(() => ({
  router: { replace: vi.fn(), push: vi.fn(), back: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() },
  auth: { current: {} as ReturnType<typeof authStub> },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/orders/o-1",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/features/auth/AuthProvider", () => ({ useAuth: () => auth.current }));

const { RequireAuth } = await import("@/features/auth/components/RequireAuth");

beforeEach(() => {
  vi.clearAllMocks();
  auth.current = authStub();
});

const screenUnder = () => render(<RequireAuth><p>Order detail</p></RequireAuth>);

describe("the session gate", () => {
  it("draws the screen for a signed-in baker", () => {
    screenUnder();

    expect(screen.getByText("Order detail")).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("shows nothing of the screen while it does not yet know who is asking", () => {
    auth.current = authStub({ status: "loading", profile: null });
    screenUnder();

    expect(screen.queryByText("Order detail")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(UI_TEXT.auth.checkingSession);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("sends a visitor with no session to sign in, remembering where they were", async () => {
    auth.current = authStub({ status: "anonymous", profile: null });
    screenUnder();

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login?next=%2Forders%2Fo-1"));
    expect(screen.queryByText("Order detail")).not.toBeInTheDocument();
  });

  it("lets a baker holding a temporary password see nothing but the screen that replaces it", async () => {
    auth.current = authStub({ requiresPasswordChange: true });
    screenUnder();

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/change-password"));
    expect(screen.queryByText("Order detail")).not.toBeInTheDocument();
  });
});
