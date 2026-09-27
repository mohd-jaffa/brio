import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/client";
import { anAuditEntry, answering } from "@tests/support/admin";
import { Providers } from "@tests/support/providers";

const fetcher = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/client", async (original) => ({ ...(await original<typeof import("@/lib/api/client")>()), fetcher }));

const { AuditLog } = await import("@/features/admin/components/AuditLog");

beforeEach(() => {
  answering(fetcher, {
    "/api/admin/audit": {
      items: [
        anAuditEntry("a-1"),
        anAuditEntry("a-2", { action: "CREATE", entityType: "customers", actor: null, business: null, before: null }),
      ],
      nextCursor: null,
    },
  });
});

const open = () => render(<AuditLog />, { wrapper: Providers });

describe("the console's audit log", () => {
  it("lists what was done, to what, by whom, for which business and when", async () => {
    open();
    expect(screen.getByRole("heading", { level: 1, name: "Audit log" })).toBeInTheDocument();
    const entry = within((await screen.findByRole("heading", { name: "orders" })).closest("article")!);
    expect(entry.getByText("UPDATE")).toBeInTheDocument();
    expect(entry.getByText("7c1f3a52-9d7e-4b1a-8a51-0f1d2c3b4a5e")).toBeInTheDocument();
    expect(entry.getByText("by Priya Baker · Sweet Delights")).toBeInTheDocument();
    expect(entry.getByText("27 Sep 2026, 3:30 PM")).toBeInTheDocument();
  });

  it("shows the values before and after, and Nothing where there were none", async () => {
    open();
    const entry = within((await screen.findByRole("heading", { name: "customers" })).closest("article")!);
    expect(entry.getByText("by someone no longer here")).toBeInTheDocument();
    await userEvent.click(entry.getByText("Before and after"));
    expect(entry.getByRole("figure", { name: "Before" })).toHaveTextContent("Nothing");
    expect(entry.getByRole("figure", { name: "After" })).toHaveTextContent('"status": "READY"');
  });

  it("says when nothing is recorded, and when the trail could not be read", async () => {
    answering(fetcher, { "/api/admin/audit": { items: [], nextCursor: null } });
    const { unmount } = open();
    expect(await screen.findByText("Nothing has been recorded yet.")).toBeInTheDocument();
    unmount();

    answering(fetcher, { "/api/admin/audit": new ApiError(500, "INTERNAL_ERROR", "Something went wrong.", "req_1") });
    open();
    expect(await screen.findByText("Something went wrong.")).toBeInTheDocument();
  });
});
