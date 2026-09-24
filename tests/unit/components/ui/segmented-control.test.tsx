import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SegmentedControl } from "@/components/ui/segmented-control";

describe("SegmentedControl", () => {
  it("is a real radiogroup, so it can be changed from the keyboard", async () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        label="Which orders to show"
        value="ACTIVE"
        options={[
          { value: "ACTIVE", label: "Active" },
          { value: "PAST", label: "Past" },
        ]}
        onChange={onChange}
      />,
    );

    const group = screen.getByRole("radiogroup", { name: "Which orders to show" });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Active" })).toBeChecked();

    await userEvent.click(screen.getByRole("radio", { name: "Past" }));
    expect(onChange).toHaveBeenCalledWith("PAST");
  });
});
