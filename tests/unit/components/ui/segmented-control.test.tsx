import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SegmentedControl } from "@/components/ui/segmented-control";

const OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "PAST", label: "Past" },
] as const;

describe("SegmentedControl", () => {
  it("is a real radiogroup, changed by a tap", async () => {
    const onChange = vi.fn();
    render(<SegmentedControl label="Which orders to show" value="ACTIVE" options={OPTIONS} onChange={onChange} />);

    expect(screen.getByRole("radiogroup", { name: "Which orders to show" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Active" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Active" })).toHaveClass("bg-surface");

    await userEvent.click(screen.getByRole("radio", { name: "Past" }));
    expect(onChange).toHaveBeenCalledWith("PAST");
  });

  it("is changed with the arrow keys", async () => {
    const onChange = vi.fn();
    render(<SegmentedControl label="Orders" value="ACTIVE" options={OPTIONS} onChange={onChange} />);
    screen.getByRole("radio", { name: "Active" }).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenCalledWith("PAST");
  });
});
