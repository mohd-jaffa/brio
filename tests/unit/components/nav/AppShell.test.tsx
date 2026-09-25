import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ALL_NAV, BOTTOM_NAV } from "@/constants/navigation";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";
import { authStub } from "@tests/support/auth";

import { AppShell } from "@/components/nav/AppShell";

// The shell is drawn for a signed-in baker; who that is belongs to the auth
// feature's own tests, not to what the navigation offers.
const { auth } = vi.hoisted(() => ({ auth: { current: {} as ReturnType<typeof authStub> } }));
vi.mock("@/features/auth/AuthProvider", () => ({ useAuth: () => auth.current }));
// The mark's own states are BusinessMark's tests; here it is simply loaded.
vi.mock("@/features/business/hooks/useBusiness", () => ({
  useBusiness: () => ({ data: { id: "b-1", name: "Asha's Kitchen", tagline: null, city: null, address: null, phone: "+919876543210", logoUrl: null } }),
}));

beforeEach(() => {
  auth.current = authStub();
});

function shell() {
  return render(
    <ThemeProvider>
      <AppShell>
        <p>Screen content</p>
      </AppShell>
    </ThemeProvider>,
  );
}

const navs = () => screen.getAllByRole("navigation", { name: "Main navigation" });

describe("AppShell", () => {
  it("puts the screen's own content in the main region", () => {
    shell();
    expect(within(screen.getByRole("main")).getByText("Screen content")).toBeInTheDocument();
  });

  it("offers every destination in the sidebar, in the plan's groups", () => {
    shell();
    const [sidebar] = navs();
    expect(within(sidebar).getAllByRole("list")).toHaveLength(3);
    expect(within(sidebar).getAllByRole("link").map((link) => link.textContent)).toEqual(
      ALL_NAV.map((item) => item.label),
    );
  });

  it("puts Home, Orders, Products, Customers and More on a phone's bottom bar", () => {
    shell();
    const [, bottom] = navs();
    const names = [
      ...within(bottom).getAllByRole("link").map((link) => link.textContent),
      ...within(bottom).getAllByRole("button").map((button) => button.textContent),
    ];
    expect(names.sort()).toEqual(BOTTOM_NAV.map((item) => item.label).sort());
  });

  it("marks the page being viewed as the current one, with the tinted pill", () => {
    shell();
    for (const home of screen.getAllByRole("link", { name: "Home" })) {
      expect(home).toHaveAttribute("aria-current", "page");
      expect(home).toHaveClass("bg-primary-soft");
    }
    expect(screen.getAllByRole("link", { name: "Orders" })[0]).not.toHaveAttribute("aria-current");
  });

  it("shows the business's mark and the account's initials on a phone", () => {
    shell();
    const [phoneBar] = screen.getAllByRole("banner");
    expect(within(phoneBar).getByText("Asha's Kitchen")).toBeInTheDocument();
    const account = within(phoneBar).getByRole("link", { name: "Account: Asha Baker" });
    expect(account).toHaveAttribute("href", "/settings");
    expect(account).toHaveTextContent("AB");
  });

  it("opens the rest of the app behind More, and says whether it is open", async () => {
    shell();
    const more = screen.getByRole("button", { name: "More" });

    expect(more).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(more);

    expect(more).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("dialog", { name: "More" })).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(more).toHaveAttribute("aria-expanded", "false");
  });

  it("leaves out the account when nobody is signed in yet", () => {
    auth.current = authStub({ profile: null, status: "authenticated" });
    shell();
    expect(screen.queryByRole("link", { name: /Account:/ })).not.toBeInTheDocument();
  });
});
