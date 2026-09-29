import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ProductCard } from "@/components/ui/product-card";

const labels = {
  name: "Chocolate truffle cake",
  price: "₹1,250",
  addLabel: "Add Chocolate truffle cake",
  removeLabel: "Remove one Chocolate truffle cake",
};

describe("ProductCard", () => {
  it("shows the illustration, the name and the price, and adds with its +", async () => {
    const onAdd = vi.fn();
    const onAddOrigin = vi.fn();
    const { container } = render(<ProductCard {...labels} iconKey="donut" onAdd={onAdd} onAddOrigin={onAddOrigin} />);
    expect(screen.getByText("Chocolate truffle cake")).toHaveClass("line-clamp-2");
    expect(screen.getByText("₹1,250")).toBeInTheDocument();
    expect(container.querySelector("img")?.getAttribute("src")).toMatch(/donut/);

    const add = screen.getByRole("button", { name: "Add Chocolate truffle cake" });
    expect(add).toHaveClass("hit-area");
    await userEvent.click(add);
    expect(onAdd).toHaveBeenCalledOnce();
    expect(onAddOrigin).toHaveBeenCalledWith(add);
  });

  it("cannot be added while disabled", () => {
    render(<ProductCard name="Brownie" price="₹220" addLabel="Add Brownie" onAdd={() => {}} disabled />);
    expect(screen.getByRole("button", { name: "Add Brownie" })).toBeDisabled();
  });

  it("only adds while none are in the order, or when nothing can take one off", () => {
    const { rerender } = render(<ProductCard {...labels} onAdd={vi.fn()} onRemove={vi.fn()} quantity={0} />);
    expect(screen.queryByRole("button", { name: labels.removeLabel })).not.toBeInTheDocument();

    rerender(<ProductCard {...labels} onAdd={vi.fn()} quantity={2} quantityLabel="2 in the order" />);
    expect(screen.queryByRole("button", { name: labels.removeLabel })).not.toBeInTheDocument();
    expect(screen.getByText("2 in the order")).toHaveClass("sr-only");
  });

  it("grows the + into − count + once some are in the order, and takes one off with the −", async () => {
    const onRemove = vi.fn();
    render(<ProductCard {...labels} onAdd={vi.fn()} onRemove={onRemove} quantity={3} quantityLabel="3 in the order" />);
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("3 in the order")).toBeInTheDocument();
    const less = screen.getByRole("button", { name: labels.removeLabel });
    expect(less).toHaveClass("hit-area");
    await userEvent.click(less);
    expect(onRemove).toHaveBeenCalledOnce();
    // Not the last one: focus stays where it was.
    expect(less).toHaveFocus();
  });

  it("keeps focus on the + when the last one comes off", async () => {
    const onRemove = vi.fn();
    const { rerender } = render(<ProductCard {...labels} onAdd={vi.fn()} onRemove={onRemove} quantity={1} />);
    const add = screen.getByRole("button", { name: labels.addLabel });
    await userEvent.click(screen.getByRole("button", { name: labels.removeLabel }));
    expect(onRemove).toHaveBeenCalledOnce();
    expect(add).toHaveFocus();

    rerender(<ProductCard {...labels} onAdd={vi.fn()} onRemove={onRemove} quantity={0} />);
    expect(screen.getByRole("button", { name: labels.addLabel })).toBe(add);
  });

  it("pops the − count + in with the first one added, and not when it was there from the start", () => {
    const props = { ...labels, onAdd: vi.fn(), onRemove: vi.fn() };
    const pill = () => screen.getByRole("button", { name: labels.addLabel }).parentElement;
    const { unmount } = render(<ProductCard {...props} quantity={2} />);
    expect(pill()).not.toHaveClass("animate-pop");
    unmount();

    const again = render(<ProductCard {...props} quantity={0} />);
    again.rerender(<ProductCard {...props} quantity={1} />);
    expect(pill()).toHaveClass("animate-pop", "origin-right");
  });
});
