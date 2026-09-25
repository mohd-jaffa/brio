import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ChoiceChips } from "@/components/ui/choice-chips";

const OPTIONS = [
  { value: "ALL", label: "All" },
  { value: "CAKES", label: "Cakes" },
  { value: "COOKIES", label: "Cookies" },
] as const;

describe("ChoiceChips", () => {
  it("is a radiogroup of pills, the chosen one filled", async () => {
    const onChange = vi.fn();
    render(<ChoiceChips label="Category" value="ALL" options={OPTIONS} onChange={onChange} />);
    expect(screen.getByRole("radiogroup", { name: "Category" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "All" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "All" })).toHaveClass("bg-primary");
    expect(screen.getByRole("radio", { name: "Cakes" })).toHaveClass("bg-surface");

    await userEvent.click(screen.getByRole("radio", { name: "Cookies" }));
    expect(onChange).toHaveBeenCalledWith("COOKIES");
  });

  it("moves the choice with the arrow keys", async () => {
    const onChange = vi.fn();
    render(<ChoiceChips label="Category" value="ALL" options={OPTIONS} onChange={onChange} />);
    screen.getByRole("radio", { name: "All" }).focus();
    await userEvent.keyboard("{ArrowLeft}");
    expect(onChange).toHaveBeenCalledWith("COOKIES");
  });
});
