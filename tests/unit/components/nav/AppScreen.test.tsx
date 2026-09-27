import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

const { readScreen, getBusiness, countUnread } = vi.hoisted(() => ({
  readScreen: vi.fn(async () => ({ queries: { "/api/business": { name: "Asha's Kitchen" } }, pages: {} })),
  getBusiness: vi.fn(),
  countUnread: vi.fn(),
}));
vi.mock("@/features/auth/session.server", () => ({ readScreen }));
vi.mock("@/features/business/api", () => ({ getBusiness }));
vi.mock("@/features/notifications/api", () => ({ countUnread }));
vi.mock("@/components/nav/AppShell", () => ({ AppShell: ({ children }: { children: ReactNode }) => <main>{children}</main> }));
vi.mock("@/lib/query/ServerData", () => ({
  ServerData: ({ queries, children }: { queries: Record<string, unknown>; children: ReactNode }) => (
    <div data-keys={Object.keys(queries).join(",")}>{children}</div>
  ),
}));

const { AppScreen } = await import("@/components/nav/AppScreen");

describe("AppScreen", () => {
  it("reads the frame's data and the screen's before the page is drawn, and draws the screen in the shell", async () => {
    const products = vi.fn();
    const orders = vi.fn();

    render(await AppScreen({ queries: { "/api/products": products }, pages: { "/api/orders": orders }, children: <p>The screen</p> }));

    expect(readScreen).toHaveBeenCalledWith({
      queries: { "/api/business": getBusiness, "/api/notifications/unread": countUnread, "/api/products": products },
      pages: { "/api/orders": orders },
    });
    expect(screen.getByRole("main")).toHaveTextContent("The screen");
    expect(screen.getByText("The screen").closest("[data-keys]")).toHaveAttribute("data-keys", "/api/business");
  });
});
