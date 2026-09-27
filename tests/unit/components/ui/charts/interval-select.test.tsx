import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { IntervalSelect } from "@/components/ui/charts/interval-select";
import { choose } from "@tests/support/select";

describe("IntervalSelect", () => {
  it("chooses daily or weekly", async () => {
    const onChange = vi.fn();
    render(<IntervalSelect value="DAY" onChange={onChange} />);
    expect(screen.getByRole("combobox", { name: "Group by" })).toHaveTextContent("Daily");
    await choose("Group by", "Weekly");
    expect(onChange).toHaveBeenCalledWith("WEEK");
  });
});
