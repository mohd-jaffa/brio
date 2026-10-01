import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { devAuth } from "@tests/support/admin";
import { authStub } from "@tests/support/auth";
import { Providers } from "@tests/support/providers";

const { router, auth, path } = vi.hoisted(() => ({
  router: { replace: vi.fn(), push: vi.fn(), back: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() },
  auth: { current: {} as ReturnType<typeof authStub> },
  path: { current: "/admin" },
}));
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => path.current,
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/features/auth/AuthProvider", () => ({ useAuth: () => auth.current }));

const { DevShell } = await import("@/features/admin/components/DevShell");

beforeEach(() => {
  vi.clearAllMocks();
  auth.current = devAuth();
  path.current = "/admin";
});

const open = () =>
  render(
    <DevShell>
      <p>Console page</p>
    </DevShell>,
    { wrapper: Providers },
  );

describe("the developer console's frame", () => {
  it("names the console, says who is signed in, and shows the page", () => {
    open();
    const bar = screen.getByRole("banner");
    expect(bar).toHaveTextContent("Developer console");
    expect(within(bar).getByText("Brio Developer")).toBeInTheDocument();
    expect(within(bar).getByText("Developer · +91 91234 56789")).toBeInTheDocument();
    expect(screen.getByText("Console page")).toBeInTheDocument();
  });

  it("offers its places, and marks the one open", () => {
    path.current = "/admin/audit";
    open();
    const nav = screen.getByRole("navigation", { name: "Developer console" });
    const links = within(nav).getAllByRole("link");
    expect(links.map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
      ["Overview", "/admin"],
      ["Users", "/admin/users"],
      ["Error log", "/admin/logs"],
      ["Audit log", "/admin/audit"],
    ]);
    expect(within(nav).getByRole("link", { name: "Audit log" })).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("link", { name: "Overview" })).not.toHaveAttribute("aria-current");
  });

  it("marks the overview only on the overview", () => {
    open();
    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute("aria-current", "page");
  });

  it("signs out once the developer says so", async () => {
    open();
    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(auth.current.signOut).not.toHaveBeenCalled();
    await userEvent.click(
      within(screen.getByRole("alertdialog", { name: "Sign out?" })).getByRole("button", { name: "Sign out" }),
    );
    expect(auth.current.signOut).toHaveBeenCalled();
  });

  it("sends an owner home, and shows them nothing of the console", async () => {
    auth.current = authStub();
    open();
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/home"));
    expect(screen.queryByText("Console page")).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("sends a visitor with no session to sign in, and a developer owing a password change to replace it", async () => {
    auth.current = authStub({ status: "anonymous", profile: null });
    const { unmount } = open();
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login?next=%2Fadmin"));
    unmount();

    auth.current = devAuth({ requiresPasswordChange: true });
    open();
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/change-password"));
    expect(screen.queryByText("Console page")).not.toBeInTheDocument();
  });

  it("waits for the session before showing anything", () => {
    auth.current = authStub({ status: "loading", profile: null });
    open();
    expect(screen.queryByText("Console page")).not.toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });
});
