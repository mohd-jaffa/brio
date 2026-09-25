import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { RangePicker } from "@/components/ui/range-picker";
import type { DateRange } from "@/constants/ranges";

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
  it("is a labelled select of the periods", async () => {
    render(<Picker start={{ preset: "LAST_30_DAYS" }} />);
    const select = screen.getByRole("combobox", { name: "Period" });
    expect(select).toHaveValue("LAST_30_DAYS");
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
      "Last 7 days",
      "Last 30 days",
      "This month",
      "Last month",
      "Custom",
    ]);
    await userEvent.selectOptions(select, "THIS_MONTH");
    expect(chosen()).toEqual({ preset: "THIS_MONTH" });
    expect(screen.queryByLabelText("From")).not.toBeInTheDocument();
  });

  it("asks for two dates when the period is custom, each bounding the other", () => {
    render(<Picker start={{ preset: "CUSTOM", from: "2026-09-01" }} />);
    const from = screen.getByLabelText("From");
    const to = screen.getByLabelText("To");
    expect(from).toHaveValue("2026-09-01");
    expect(to).toHaveAttribute("min", "2026-09-01");

    fireEvent.change(to, { target: { value: "2026-09-20" } });
    expect(chosen()).toEqual({ preset: "CUSTOM", from: "2026-09-01", to: "2026-09-20" });
    expect(from).toHaveAttribute("max", "2026-09-20");

    fireEvent.change(from, { target: { value: "" } });
    expect(chosen()).toEqual({ preset: "CUSTOM", to: "2026-09-20" });
  });
});
