import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { IntervalSelect } from "@/components/ui/charts/interval-select";

describe("IntervalSelect", () => {
  it("chooses daily or weekly", async () => {
    const onChange = vi.fn();
    render(<IntervalSelect value="DAY" onChange={onChange} />);
    expect(screen.getByLabelText("Group by")).toHaveValue("DAY");
    await userEvent.selectOptions(screen.getByLabelText("Group by"), "WEEK");
    expect(onChange).toHaveBeenCalledWith("WEEK");
  });
});
