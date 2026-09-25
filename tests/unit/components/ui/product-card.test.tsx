import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ProductCard } from "@/components/ui/product-card";

describe("ProductCard", () => {
  it("shows the illustration, the name and the price, and adds with its +", async () => {
    const onAdd = vi.fn();
    const { container } = render(
      <ProductCard name="Chocolate truffle cake" price="₹1,250" iconKey="donut" addLabel="Add Chocolate truffle cake" onAdd={onAdd} />,
    );
    expect(screen.getByText("Chocolate truffle cake")).toHaveClass("line-clamp-2");
    expect(screen.getByText("₹1,250")).toBeInTheDocument();
    expect(container.querySelector("img")?.getAttribute("src")).toMatch(/donut/);

    const add = screen.getByRole("button", { name: "Add Chocolate truffle cake" });
    expect(add).toHaveClass("hit-area");
    await userEvent.click(add);
    expect(onAdd).toHaveBeenCalledOnce();
  });

  it("cannot be added while disabled", () => {
    render(<ProductCard name="Brownie" price="₹220" addLabel="Add Brownie" onAdd={() => {}} disabled />);
    expect(screen.getByRole("button", { name: "Add Brownie" })).toBeDisabled();
  });
});
