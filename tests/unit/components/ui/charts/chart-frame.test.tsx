import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ChartFrame, type ChartShape } from "@/components/ui/charts/chart-frame";

const TABLE = { columns: ["Date", "Amount"], rows: [["1 Sep", "₹300"], ["2 Sep", "₹420"]] };

function frame(props: Partial<Parameters<typeof ChartFrame>[0]> = {}) {
  return render(
    <ChartFrame
      title="Expense trend"
      shape="bar"
      height={200}
      empty={false}
      table={TABLE}
      emptyMessage="No expenses in the last 7 days"
      {...props}
    >
      <div>the plot</div>
    </ChartFrame>,
  );
}

describe("ChartFrame", () => {
  it("is a figure named by its heading, with the chart and its table", () => {
    frame({ action: <button type="button">Daily</button>, legend: <p>legend</p> });
    const figure = screen.getByRole("figure", { name: "Expense trend" });
    expect(within(figure).getByRole("heading", { name: "Expense trend" })).toBeInTheDocument();
    expect(within(figure).getByRole("button", { name: "Daily" })).toBeInTheDocument();
    expect(within(figure).getByText("legend")).toBeInTheDocument();
    expect(within(figure).getByText("the plot")).toBeInTheDocument();

    const table = within(figure).getByRole("table", { name: "Expense trend" });
    expect(within(table).getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual(["Date", "Amount"]);
    expect(within(table).getByRole("rowheader", { name: "2 Sep" })).toBeInTheDocument();
    expect(within(table).getByRole("cell", { name: "₹420" })).toBeInTheDocument();
    expect(figure).not.toHaveAttribute("aria-busy");
  });

  it.each<ChartShape>(["line", "bar", "donut"])("shows a %s skeleton, and says it is loading", (shape) => {
    const { container } = frame({ shape, loading: true });
    expect(screen.getByRole("figure")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Loading…");
    expect(container.querySelector('[aria-hidden="true"].animate-pulse')).toBeInTheDocument();
    expect(screen.queryByText("the plot")).not.toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows an error with Try again", async () => {
    const onRetry = vi.fn();
    frame({ error: "We couldn’t load your expenses.", onRetry });
    expect(screen.getByRole("alert")).toHaveTextContent("We couldn’t load your expenses.");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
    expect(screen.queryByText("the plot")).not.toBeInTheDocument();
  });

  it("offers no Try again when there is nothing to retry", () => {
    frame({ error: "We couldn’t load your expenses." });
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  });

  it("names the empty period and offers the next step", () => {
    frame({ empty: true, emptyAction: <a href="/expenses">Add expense</a> });
    expect(screen.getByText("No expenses in the last 7 days")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add expense" })).toBeInTheDocument();
    expect(screen.queryByText("the plot")).not.toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
