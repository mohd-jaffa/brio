import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/client";
import { anOverview, answering, devAuth } from "@tests/support/admin";
import { authStub } from "@tests/support/auth";
import { Providers } from "@tests/support/providers";

const { fetcher, auth } = vi.hoisted(() => ({
  fetcher: vi.fn(),
  auth: { current: {} as ReturnType<typeof authStub> },
}));
vi.mock("@/lib/api/client", async (original) => ({
  ...(await original<typeof import("@/lib/api/client")>()),
  fetcher,
}));
vi.mock("@/features/auth/AuthProvider", () => ({ useAuth: () => auth.current }));

const { Overview } = await import("@/features/admin/components/Overview");

beforeEach(() => {
  auth.current = devAuth();
  answering(fetcher, { "/api/admin/overview": anOverview() });
});

const open = () => render(<Overview />, { wrapper: Providers });

describe("the console's overview", () => {
  it("says who is signed in: the developer, how they sign in, and their role", () => {
    open();
    expect(screen.getByRole("heading", { level: 1, name: "Overview" })).toBeInTheDocument();
    const me = screen.getByRole("region", { name: "Signed in as" });
    expect(me).toHaveTextContent("Brio Developer");
    expect(me).toHaveTextContent("Developer · +91 91234 56789 · dev@brio.local");
  });

  it("counts the platform: accounts, businesses and audit entries", async () => {
    open();
    expect(await screen.findByText("Total users")).toBeInTheDocument();
    const figure = (label: string) => screen.getByText(label).closest("div")!;
    expect(figure("Total users")).toHaveTextContent("5");
    expect(figure("Businesses")).toHaveTextContent("4");
    expect(figure("Audit entries")).toHaveTextContent("120");
    expect(screen.queryByText(/Jobs/)).not.toBeInTheDocument();
    expect(screen.getByText("4 owners · 1 developer · 9 in the last 24 hours")).toBeInTheDocument();
  });

  it("says plainly what is kept, and that server errors are not", () => {
    open();
    expect(screen.getByText(/Server errors are not stored/)).toBeInTheDocument();
  });

  it("says when the counts could not be read, and tries again", async () => {
    answering(fetcher, {
      "/api/admin/overview": new ApiError(500, "INTERNAL_ERROR", "Something went wrong.", "req_1"),
    });
    open();
    expect(await screen.findByText("Something went wrong.")).toBeInTheDocument();
    answering(fetcher, { "/api/admin/overview": anOverview() });
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Total users")).toBeInTheDocument();
  });

  it("shows nothing of who is signed in before the session is known", () => {
    auth.current = authStub({ status: "loading", profile: null });
    open();
    expect(screen.queryByRole("region", { name: "Signed in as" })).not.toBeInTheDocument();
    expect(within(document.body).getByText(/Server errors are not stored/)).toBeInTheDocument();
  });
});
