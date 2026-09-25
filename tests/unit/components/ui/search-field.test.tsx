import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SearchField } from "@/components/ui/search-field";

describe("SearchField", () => {
  afterEach(() => vi.restoreAllMocks());

  it("names itself for a screen reader, not only with a placeholder", async () => {
    const onChange = vi.fn();
    render(<SearchField value="" onChange={onChange} placeholder="Search by name or phone" />);

    const field = screen.getByRole("searchbox", { name: "Search by name or phone" });
    expect(field).toHaveClass("placeholder:text-text-muted");
    await userEvent.type(field, "me");
    expect(onChange).toHaveBeenCalledWith("m");
    expect(field).not.toHaveAttribute("aria-keyshortcuts");
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

  it("is reached from anywhere with ⌘K or Ctrl K when it is the global search", () => {
    const { unmount } = render(<SearchField value="" onChange={() => {}} placeholder="Search anything" global />);
    const field = screen.getByRole("searchbox", { name: "Search anything" });
    expect(field).toHaveAttribute("aria-keyshortcuts", "Meta+K Control+K");

    fireEvent.keyDown(window, { key: "k", metaKey: true });
    expect(field).toHaveFocus();
    field.blur();
    fireEvent.keyDown(window, { key: "K", ctrlKey: true });
    expect(field).toHaveFocus();
    field.blur();
    fireEvent.keyDown(window, { key: "k" });
    fireEvent.keyDown(window, { key: "j", metaKey: true });
    expect(field).not.toHaveFocus();

    unmount();
    fireEvent.keyDown(window, { key: "k", metaKey: true });
  });

  it("shows the shortcut the keyboard has", () => {
    vi.spyOn(navigator, "platform", "get").mockReturnValue("MacIntel");
    const { unmount } = render(<SearchField value="" onChange={() => {}} placeholder="Search" global />);
    expect(screen.getByText("⌘K")).toBeInTheDocument();
    unmount();

    vi.spyOn(navigator, "platform", "get").mockReturnValue("Win32");
    render(<SearchField value="" onChange={() => {}} placeholder="Search" global />);
    expect(screen.getByText("Ctrl K")).toBeInTheDocument();
  });

  it("falls back to the user agent where there is no platform", () => {
    vi.spyOn(navigator, "platform", "get").mockReturnValue("");
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)");
    render(<SearchField value="" onChange={() => {}} placeholder="Search" global />);
    expect(screen.getByText("⌘K")).toBeInTheDocument();
  });
});
