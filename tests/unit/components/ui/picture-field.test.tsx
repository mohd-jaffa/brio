import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PictureField } from "@/components/ui/picture-field";

describe("PictureField", () => {
  it("shows the picture in use by name, and chooses another from the library", async () => {
    const onChange = vi.fn();
    render(<PictureField value="cupcake" fallback="default-product" onChange={onChange} />);
    expect(screen.getByText("Picture")).toBeInTheDocument();
    expect(screen.getByText("Cupcake")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Picture: Cupcake. Change" }));
    const picker = screen.getByRole("dialog", { name: "Choose a picture" });
    expect(within(picker).getByRole("radio", { name: "Cupcake" })).toHaveAttribute("aria-checked", "true");
    await userEvent.click(within(picker).getByRole("radio", { name: "Donut" }));
    expect(onChange).toHaveBeenCalledWith("donut");
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Choose a picture" })).not.toBeInTheDocument());
  });

  it("shows its fallback when there is none, or the library no longer has it", () => {
    const { rerender, container } = render(<PictureField value={null} fallback="default-expense" onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Picture: Receipt. Change" })).toBeInTheDocument();
    expect(container.querySelector("img")?.getAttribute("src")).toMatch(/default-expense/);
    rerender(<PictureField value="retired-key" fallback="default-expense" onChange={vi.fn()} />);
    expect(screen.getByText("Receipt")).toBeInTheDocument();
  });
});
