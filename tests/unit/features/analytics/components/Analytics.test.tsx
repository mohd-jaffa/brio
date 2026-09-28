import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Analytics } from "@/features/analytics/components/Analytics";

import { aReport } from "@tests/support/analytics";
import { sizeCharts } from "@tests/support/charts";
import { Providers } from "@tests/support/providers";
import { choose } from "@tests/support/select";
import { pickDate } from "@tests/support/date";

const fetcher = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/client", async (original) => ({
  ...(await original<typeof import("@/lib/api/client")>()),
  fetcher,
}));

let answers: Record<string, unknown>;

beforeEach(() => {
  sizeCharts();
  answers = { "/api/analytics/overview?range=LAST_30_DAYS": aReport() };
  fetcher.mockReset();
  fetcher.mockImplementation(async (key: string) => {
    const answer = answers[key];
    if (answer instanceof Error) throw answer;
    return answer;
  });
});

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

const open = () => render(<Analytics />, { wrapper: Providers });

describe("Analytics", () => {
  it("shows the four figures with how each moved on the period before (IMP-10)", async () => {
    open();
    expect(screen.getByRole("heading", { level: 1, name: "Analytics" })).toBeInTheDocument();
    const sales = (await screen.findByText("Total sales")).parentElement!;
    expect(sales).toHaveTextContent("₹4,500");
    expect(sales).toHaveTextContent("Up 13%");
    expect(screen.getByText("Total orders").parentElement).toHaveTextContent("No change");
    // Nothing before to compare with: no delta at all.
    expect(screen.getByText("New customers").parentElement).not.toHaveTextContent("%");
    expect(screen.getByText("Average order value").parentElement).toHaveTextContent("Down 6%");
  });

  it("draws the sales trend and the best sellers, and goes to every product from them", async () => {
    open();
    expect(await screen.findByRole("heading", { name: "Sales trend" })).toBeInTheDocument();
    const top = screen.getByRole("region", { name: "Top selling products" });
    expect(within(top).getByText("Truffle cake")).toBeInTheDocument();
    expect(within(top).getByText("4 orders")).toBeInTheDocument();

    await userEvent.click(within(top).getByRole("button", { name: "View all products" }));
    expect(screen.getByRole("tab", { name: "Products" })).toHaveAttribute("aria-selected", "true");
  });

  it("reads another period and remembers it for this screen", async () => {
    open();
    await screen.findByText("Total sales");
    answers["/api/analytics/overview?range=THIS_MONTH"] = aReport();
    await choose("Period", "This month");
    expect(fetcher).toHaveBeenCalledWith("/api/analytics/overview?range=THIS_MONTH");
    expect(JSON.parse(localStorage.getItem("brio_range_analytics")!)).toEqual({ preset: "THIS_MONTH" });
  });

  it("waits for both dates of a custom period before asking", async () => {
    open();
    await screen.findByText("Total sales");
    await choose("Period", "Custom");
    expect(screen.getByRole("status", { name: "Loading analytics" })).toBeInTheDocument();

    answers["/api/analytics/overview?range=CUSTOM&from=2026-09-01&to=2026-09-02"] = aReport();
    await pickDate("From", "2026-09-01");
    // Half a period is not asked for.
    expect(fetcher).not.toHaveBeenCalledWith(expect.stringMatching(/range=CUSTOM(&from=2026-09-01)?$/));
    await pickDate("To", "2026-09-02");
    expect(await screen.findByText("Total sales")).toBeInTheDocument();
  });

  it("groups the trend by week when asked", async () => {
    open();
    await screen.findByText("Total sales");
    answers["/api/analytics/overview?range=LAST_30_DAYS&interval=WEEK"] = aReport({ interval: "WEEK" });
    await choose("Group by", "Weekly");
    expect(fetcher).toHaveBeenCalledWith("/api/analytics/overview?range=LAST_30_DAYS&interval=WEEK");
  });

  it("says why it could not load, and tries again", async () => {
    answers["/api/analytics/overview?range=LAST_30_DAYS"] = new Error("offline");
    open();
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load your analytics");
    answers["/api/analytics/overview?range=LAST_30_DAYS"] = aReport();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Total sales")).toBeInTheDocument();
  });

  it("opens each view in its own panel", async () => {
    open();
    await screen.findByText("Total sales");
    for (const [tab, heading] of [
      ["Sales", "Guest and customer sales"],
      ["Orders", "Orders by status"],
      ["Customers", "Top customers"],
    ] as const) {
      await userEvent.click(screen.getByRole("tab", { name: tab }));
      expect(within(screen.getByRole("tabpanel", { name: tab })).getByRole("heading", { name: heading })).toBeInTheDocument();
    }
  });
});
