import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { unread, pathname } = vi.hoisted(() => ({ unread: { current: 0 }, pathname: { current: "/" } }));
vi.mock("@/features/notifications/hooks/useUnreadNotifications", () => ({
  useUnreadNotifications: () => unread.current,
}));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.current }));

import { badgeCount, NotificationBell } from "@/features/notifications/components/NotificationBell";

beforeEach(() => {
  unread.current = 0;
  pathname.current = "/";
});

const badge = () => document.querySelector("[data-unread-count]");

describe("badgeCount", () => {
  it("shows the number up to nine, then 9+", () => {
    expect([1, 2, 9, 10, 11, 250].map(badgeCount)).toEqual(["1", "2", "9", "9+", "9+", "9+"]);
  });
});

describe("NotificationBell", () => {
  it("goes to the inbox, carrying no count while nothing waits", () => {
    render(<NotificationBell />);
    const bell = screen.getByRole("link", { name: "Notifications" });
    expect(bell).toHaveAttribute("href", "/notifications");
    expect(bell).not.toHaveAttribute("aria-current");
    expect(badge()).toBeNull();
  });

  it("shows how many wait, and says exactly how many in its name", () => {
    unread.current = 3;
    const { rerender } = render(<NotificationBell />);
    expect(screen.getByRole("link", { name: "Notifications, 3 unread" })).toBeInTheDocument();
    expect(badge()).toHaveTextContent("3");
    expect(badge()).toHaveAttribute("aria-hidden", "true");

    unread.current = 42;
    rerender(<NotificationBell />);
    expect(screen.getByRole("link", { name: "Notifications, 42 unread" })).toBeInTheDocument();
    expect(badge()).toHaveTextContent("9+");
  });

  it("marks itself the current page in the inbox", () => {
    pathname.current = "/notifications";
    render(<NotificationBell />);
    expect(screen.getByRole("link", { name: "Notifications" })).toHaveAttribute("aria-current", "page");
  });
});
