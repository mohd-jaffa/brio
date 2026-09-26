import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { FilterButton, SearchField } from "@/components/ui/search-field";

describe("SearchField", () => {
  it("names itself for a screen reader, not only with a placeholder", async () => {
    const onChange = vi.fn();
    render(<SearchField value="" onChange={onChange} placeholder="Search by name or phone" />);

    const field = screen.getByRole("searchbox", { name: "Search by name or phone" });
    expect(field).toHaveClass("placeholder:text-text-muted");
    await userEvent.type(field, "me");
    expect(onChange).toHaveBeenCalledWith("m");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("opens the list's filters from the button beside it, marked when some are on", async () => {
    const onClick = vi.fn();
    const { rerender } = render(
      <SearchField value="" onChange={() => {}} placeholder="Search customers" filter={{ label: "Filters", onClick }} />,
    );
    const button = screen.getByRole("button", { name: "Filters" });
    expect(button).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();

    rerender(
      <SearchField value="" onChange={() => {}} placeholder="Search customers" filter={{ label: "Filters", onClick, active: true }} />,
    );
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button.querySelector("span")).toHaveClass("bg-primary");
  });

  it("comes smaller on its own, over a list with no search", () => {
    render(<FilterButton label="Filter orders due" onClick={() => {}} size="sm" />);
    const button = screen.getByRole("button", { name: "Filter orders due" });
    expect(button).toHaveClass("size-11");
    expect(button).toHaveAttribute("aria-pressed", "false");
  });
});
