import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/client";
import { anAccount, answering } from "@tests/support/admin";
import { Providers } from "@tests/support/providers";

const fetcher = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/client", async (original) => ({
  ...(await original<typeof import("@/lib/api/client")>()),
  fetcher,
}));

const { Accounts } = await import("@/features/admin/components/Accounts");

beforeEach(() => {
  answering(fetcher, {
    "/api/admin/users": {
      items: [
        anAccount("u-dev", { name: "Brio Developer", role: "DEV", business: null, avatar: "pomeranian" }),
        anAccount("u-1"),
      ],
      nextCursor: "20",
    },
    "/api/admin/users?cursor=20": {
      items: [
        anAccount("u-2", {
          name: "Anu Cakes",
          active: false,
          emailConfirmedAt: null,
          mustChangePassword: true,
          business: { name: "Anu's", city: null },
        }),
      ],
      nextCursor: null,
    },
  });
});

const open = () => render(<Accounts />, { wrapper: Providers });
const card = (name: string) => screen.getByRole("heading", { name }).closest("article")!;

describe("the console's accounts", () => {
  it("lists every account with its role, how it signs in, its business and when it joined", async () => {
    open();
    expect(screen.getByRole("heading", { level: 1, name: "Users" })).toBeInTheDocument();
    await screen.findByRole("heading", { name: "Priya Baker" });

    const owner = within(card("Priya Baker"));
    expect(owner.getByText("Owner")).toBeInTheDocument();
    expect(owner.getByText("+91 98765 43210")).toBeInTheDocument();
    expect(owner.getByText("baker@example.com")).toBeInTheDocument();
    expect(owner.getByText("Sweet Delights, Bengaluru")).toBeInTheDocument();
    expect(owner.getByText("26 Jun 2026")).toBeInTheDocument();

    const developer = within(card("Brio Developer"));
    expect(developer.getByText("Developer")).toBeInTheDocument();
    expect(developer.getByText("None")).toBeInTheDocument();
  });

  it("marks what is outstanding on an account, and shows more a page at a time", async () => {
    open();
    await screen.findByRole("heading", { name: "Priya Baker" });
    expect(within(card("Priya Baker")).queryByText("Deactivated")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Show more" }));

    const later = within(
      await screen.findByRole("heading", { name: "Anu Cakes" }).then((heading) => heading.closest("article")!),
    );
    expect(later.getByText("Deactivated")).toBeInTheDocument();
    expect(later.getByText("Email not confirmed")).toBeInTheDocument();
    expect(later.getByText("Owes a password change")).toBeInTheDocument();
    expect(later.getByText("Anu's")).toBeInTheDocument();
  });

  it("says when there are none, and when they could not be read", async () => {
    answering(fetcher, { "/api/admin/users": { items: [], nextCursor: null } });
    const { unmount } = open();
    expect(await screen.findByText("No accounts yet.")).toBeInTheDocument();
    unmount();

    answering(fetcher, { "/api/admin/users": new ApiError(500, "INTERNAL_ERROR", "Something went wrong.", "req_1") });
    open();
    expect(await screen.findByText("Something went wrong.")).toBeInTheDocument();
  });
});
