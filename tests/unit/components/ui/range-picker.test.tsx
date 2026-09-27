import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { RangePicker } from "@/components/ui/range-picker";
import type { DateRange } from "@/constants/ranges";
import { pickDate } from "@tests/support/date";

function Picker({ start }: { start: DateRange }) {
  const [range, setRange] = useState(start);
  return (
    <>
      <RangePicker value={range} onChange={setRange} />
      <output>{JSON.stringify(range)}</output>
    </>
  );
}

const chosen = () => JSON.parse(screen.getByRole("status").textContent ?? "{}");

describe("RangePicker", () => {
  it("is a labelled choice of the periods, in the app's own list", async () => {
    render(<Picker start={{ preset: "LAST_30_DAYS" }} />);
    const select = screen.getByRole("combobox", { name: "Period" });
    expect(select).toHaveTextContent("Last 30 days");
    await userEvent.click(select);
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
      "Last 7 days",
      "Last 30 days",
      "This month",
      "Last month",
      "Custom",
    ]);
    await userEvent.click(screen.getByRole("option", { name: "This month" }));
    expect(chosen()).toEqual({ preset: "THIS_MONTH" });
    expect(screen.queryByRole("button", { name: /^From/ })).not.toBeInTheDocument();
  });

  it("asks for two days when the period is custom, each from the app's calendar and bounding the other", async () => {
    render(<Picker start={{ preset: "CUSTOM", from: "2026-09-01" }} />);
    expect(screen.getByRole("button", { name: "From 1 Sep 2026" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "To Choose a date" })).toBeInTheDocument();

    await pickDate("To", "2026-09-20");
    expect(chosen()).toEqual({ preset: "CUSTOM", from: "2026-09-01", to: "2026-09-20" });

    // Each end bounds the other: nothing after the 20th can start it, nothing before the 1st can end it.
    await userEvent.click(screen.getByRole("button", { name: "From 1 Sep 2026" }));
    const from = screen.getByRole("dialog", { name: "From: pick a day" });
    expect(within(from).getByRole("button", { name: "Monday, 21 Sep 2026" })).toBeDisabled();
    expect(within(from).getByRole("button", { name: "Sunday, 20 Sep 2026" })).toBeEnabled();
    await userEvent.keyboard("{Escape}");

    await userEvent.click(screen.getByRole("button", { name: "To 20 Sep 2026" }));
    const to = screen.getByRole("dialog", { name: "To: pick a day" });
    expect(within(to).getByRole("button", { name: "Previous month" })).toBeDisabled();
    expect(within(to).getByRole("button", { name: "Tuesday, 1 Sep 2026" })).toBeEnabled();
  });
});
