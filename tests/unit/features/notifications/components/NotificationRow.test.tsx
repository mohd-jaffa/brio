import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { NotificationRow } from "@/features/notifications/components/NotificationRow";
import type { AppNotification } from "@/features/notifications/types";

const aNotification = (overrides: Partial<AppNotification> = {}): AppNotification => ({
  id: "n-1",
  kind: "ORDER",
  title: "New order",
  body: "ORD-1028 placed for Priya Menon.",
  actionUrl: "/orders/o-1",
  read: false,
  createdAt: new Date().toISOString(),
  ...overrides,
});

function row(notification: AppNotification) {
  const onRead = vi.fn();
  render(
    <ul>
      <NotificationRow notification={notification} onRead={onRead} />
    </ul>,
  );
  return onRead;
}

describe("NotificationRow", () => {
  it("leads where it is about, says it is unread, and is marked read as it is followed", async () => {
    const notification = aNotification();
    const onRead = row(notification);
    const link = screen.getByRole("link", { name: /New order.*ORD-1028 placed for Priya Menon\..*Unread/ });
    expect(link).toHaveAttribute("href", "/orders/o-1");
    link.addEventListener("click", (event) => event.preventDefault());
    await userEvent.click(link);
    expect(onRead).toHaveBeenCalledWith(notification);
  });

  it("says when: the time today, then how long ago", () => {
    row(aNotification({ createdAt: "2026-01-02T05:00:00Z" }));
    expect(screen.getByText(/ago$/)).toHaveAttribute("dateTime", "2026-01-02T05:00:00Z");
  });

  it("once read, carries no dot and marks nothing again", async () => {
    const onRead = row(aNotification({ read: true }));
    const link = screen.getByRole("link");
    expect(link).not.toHaveTextContent("Unread");
    expect(document.querySelector("[data-unread-dot]")).toBeNull();
    link.addEventListener("click", (event) => event.preventDefault());
    await userEvent.click(link);
    expect(onRead).not.toHaveBeenCalled();
  });

  it("marks one that leads nowhere read where it is, and then is only a line", async () => {
    const notification = aNotification({ kind: "SYSTEM", actionUrl: null, title: "Heads up", body: "Something" });
    const onRead = row(notification);
    await userEvent.click(screen.getByRole("button", { name: /Heads up/ }));
    expect(onRead).toHaveBeenCalledWith(notification);
  });

  it("is plain text once read, when it leads nowhere", () => {
    row(aNotification({ kind: "CUSTOMER", actionUrl: null, read: true }));
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });
});
