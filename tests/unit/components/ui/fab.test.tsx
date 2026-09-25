import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Fab } from "@/components/ui/fab";

describe("Fab", () => {
  it("is a round + on a phone and a worded button from 768 px, both going to the same place", () => {
    render(<Fab href="/orders/new" label="New order" />);
    const [round, wide] = screen.getAllByRole("link", { name: "New order" });
    expect(round).toHaveAttribute("href", "/orders/new");
    expect(round).toHaveClass("rounded-full", "md:hidden");
    expect(wide).toHaveAttribute("href", "/orders/new");
    expect(wide).toHaveClass("md:inline-flex");
    expect(wide).toHaveTextContent("New order");
  });

  it("opens something instead when it acts", async () => {
    const onClick = vi.fn();
    render(<Fab onClick={onClick} label="Add customer" />);
    const [round, wide] = screen.getAllByRole("button", { name: "Add customer" });
    await userEvent.click(round);
    await userEvent.click(wide);
    expect(onClick).toHaveBeenCalledTimes(2);
  });
});
