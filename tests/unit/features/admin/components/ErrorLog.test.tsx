import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/client";
import { anErrorEntry, answering } from "@tests/support/admin";
import { Providers } from "@tests/support/providers";

const fetcher = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/client", async (original) => ({
  ...(await original<typeof import("@/lib/api/client")>()),
  fetcher,
}));

const { ErrorLog } = await import("@/features/admin/components/ErrorLog");

const quiet = anErrorEntry("e-2", {
  source: "SERVER",
  message: "Could not send the confirmation email",
  reference: null,
  code: null,
  kind: null,
  httpStatus: null,
  method: null,
  path: null,
  user: null,
  business: null,
  detail: null,
  stack: null,
  context: null,
});

beforeEach(() => {
  answering(fetcher, { "/api/admin/logs": { items: [anErrorEntry("e-1"), quiet], nextCursor: null } });
});

const open = () => render(<ErrorLog />, { wrapper: Providers });
const entryFor = async (message: string) =>
  within((await screen.findByRole("heading", { name: message })).closest("article")!);

describe("the console's error log", () => {
  it("lists what failed: where, the reference, who was asking and when", async () => {
    open();
    expect(screen.getByRole("heading", { level: 1, name: "Error log" })).toBeInTheDocument();
    expect(screen.getByText("What failed on the server, newest first. Kept for 7 days.")).toBeInTheDocument();
    const entry = await entryFor("API request failed");
    expect(entry.getByText("Request · 500")).toBeInTheDocument();
    expect(entry.getByText("POST /api/orders")).toBeInTheDocument();
    expect(entry.getByText("INTERNAL_ERROR · INTERNAL")).toBeInTheDocument();
    expect(entry.getByText("req_5e1d7c1a-2b3c-4d5e-8f90-1a2b3c4d5e6f")).toBeInTheDocument();
    expect(entry.getByText("by Priya Baker · Sweet Delights")).toBeInTheDocument();
    expect(entry.getByText("27 Sep 2026, 3:30 PM")).toBeInTheDocument();
  });

  it("shows what was thrown when asked: the detail, the stack and the context", async () => {
    open();
    const entry = await entryFor("API request failed");
    await userEvent.click(entry.getByText("What was thrown"));
    expect(entry.getByRole("figure", { name: "Detail" })).toHaveTextContent("connection terminated unexpectedly");
    expect(entry.getByRole("figure", { name: "Stack" })).toHaveTextContent("at createOrder");
    expect(entry.getByRole("figure", { name: "Context" })).toHaveTextContent('"traceId": "trace-1"');
  });

  it("says only what it knows of a failure beside a request", async () => {
    open();
    const entry = await entryFor("Could not send the confirmation email");
    expect(entry.getByText("Server")).toBeInTheDocument();
    expect(entry.getByText("no one signed in")).toBeInTheDocument();
    expect(entry.queryByText(/Reference/)).not.toBeInTheDocument();
    expect(entry.queryByText("What was thrown")).not.toBeInTheDocument();
  });

  it("finds a reference someone quoted, and says when nothing matches", async () => {
    answering(fetcher, {
      "/api/admin/logs": { items: [anErrorEntry("e-1"), quiet], nextCursor: null },
      "/api/admin/logs?search=req_404": { items: [], nextCursor: null },
    });
    open();
    await entryFor("API request failed");
    await userEvent.type(screen.getByRole("searchbox", { name: "Find a reference or a message" }), "req_404");
    expect(await screen.findByText(/req_404/)).toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledWith("/api/admin/logs?search=req_404");
  });

  it("says when nothing has failed, and when the log could not be read", async () => {
    answering(fetcher, { "/api/admin/logs": { items: [], nextCursor: null } });
    const { unmount } = open();
    expect(await screen.findByText("Nothing has failed in the last 7 days.")).toBeInTheDocument();
    unmount();

    answering(fetcher, { "/api/admin/logs": new ApiError(500, "INTERNAL_ERROR", "Something went wrong.", "req_1") });
    open();
    expect(await screen.findByText("Something went wrong.")).toBeInTheDocument();
  });
});
