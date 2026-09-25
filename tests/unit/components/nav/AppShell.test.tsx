import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SECONDARY_NAV, SIDEBAR_NAV } from "@/constants/navigation";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";
import { authStub } from "@tests/support/auth";

import { AppShell } from "@/components/nav/AppShell";
import { MoreSheet } from "@/components/nav/MoreSheet";

// The shell is drawn for a signed-in baker; who that is belongs to the auth
// feature's own tests, not to what the navigation offers.
const { auth } = vi.hoisted(() => ({ auth: { current: {} as ReturnType<typeof authStub> } }));
vi.mock("@/features/auth/AuthProvider", () => ({ useAuth: () => auth.current }));

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

describe("AppShell", () => {
  it("puts the screen's own content in the main region", () => {
    shell();
    expect(within(screen.getByRole("main")).getByText("Screen content")).toBeInTheDocument();
  });

  it("offers every destination, from the one nav list", () => {
    shell();
    for (const item of SIDEBAR_NAV) {
      expect(screen.getAllByRole("link", { name: item.label }).length).toBeGreaterThan(0);
    }
  });

  it("marks the page being viewed as the current one", () => {
    shell();
    const [dashboard] = screen.getAllByRole("link", { name: "Dashboard" });
    expect(dashboard).toHaveAttribute("aria-current", "page");
  });

  it("switches the visual direction, saying which one it is switching to", async () => {
    shell();
    const [toggle] = screen.getAllByRole("button", { name: /Switch to/ });

    await userEvent.click(toggle);
    expect(document.documentElement.getAttribute("data-theme")).toBe("peach");
  });

  it("opens the rest of the app behind More, and says whether it is open", async () => {
    shell();
    const more = screen.getByRole("button", { name: "More" });

    expect(more).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(more);

    expect(more).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("dialog", { name: "More" })).toBeInTheDocument();
  });
});

describe("MoreSheet", () => {
  it("is out of sight while it is closed", () => {
    const { container } = render(<MoreSheet isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(container.querySelector("dialog")).not.toHaveAttribute("open");
  });

  it("lists exactly the secondary destinations", () => {
    render(<MoreSheet isOpen onClose={vi.fn()} />);
    const links = within(screen.getByRole("dialog")).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual(SECONDARY_NAV.map((item) => item.label));
  });

  it("closes on Escape and from its close button", async () => {
    const onClose = vi.fn();
    render(<MoreSheet isOpen onClose={onClose} />);

    await userEvent.keyboard("{Escape}");
    await userEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("closes when a destination is chosen, so the sheet is not left over the new screen", async () => {
    const onClose = vi.fn();
    // jsdom cannot navigate, so the click is stopped before it tries.
    const stopNavigation = (event: MouseEvent) => event.preventDefault();
    document.addEventListener("click", stopNavigation);

    render(<MoreSheet isOpen onClose={onClose} />);
    await userEvent.click(screen.getByRole("link", { name: "Settings" }));

    document.removeEventListener("click", stopNavigation);
    expect(onClose).toHaveBeenCalled();
  });

  it("sends each destination where the nav list says", () => {
    render(<MoreSheet isOpen onClose={vi.fn()} />);
    for (const item of SECONDARY_NAV) {
      expect(screen.getByRole("link", { name: item.label })).toHaveAttribute("href", item.href);
    }
  });
});
