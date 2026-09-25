import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { CustomItemSheet } from "@/features/orders/components/CustomItemSheet";

function Screen({ onAdd }: { onAdd: (item: unknown) => void }) {
  const [open, setOpen] = useState(true);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Custom
      </button>
      <CustomItemSheet open={open} onClose={() => setOpen(false)} onAdd={onAdd} />
    </>
  );
}

const submit = () => screen.getByRole("button", { name: "Add custom item" });

describe("CustomItemSheet", () => {
  it("adds a named item at its price, with its description, and closes empty", async () => {
    const onAdd = vi.fn();
    render(<Screen onAdd={onAdd} />);
    expect(screen.getByRole("dialog", { name: "Custom item" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Amount/)).toHaveAttribute("inputmode", "decimal");

    await userEvent.type(screen.getByLabelText(/Item name/), "Name topper");
    await userEvent.type(screen.getByLabelText(/Description/), "Gold, “Anu”");
    await userEvent.type(screen.getByLabelText(/Amount/), "₹1,50");
    await userEvent.click(submit());

    await waitFor(() =>
      expect(onAdd).toHaveBeenCalledWith({ name: "Name topper", description: "Gold, “Anu”", unitPrice: 15000 }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Custom" }));
    expect(screen.getByLabelText(/Item name/)).toHaveValue("");
  });

  it("needs a name and an amount above nothing", async () => {
    const onAdd = vi.fn();
    render(<Screen onAdd={onAdd} />);
    await userEvent.type(screen.getByLabelText(/Amount/), "0");
    await userEvent.click(submit());

    await waitFor(() => expect(screen.getAllByRole("alert")).toHaveLength(2));
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("forgets a half-typed item when it is closed", async () => {
    render(<Screen onAdd={vi.fn()} />);
    await userEvent.type(screen.getByLabelText(/Item name/), "Card");
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    await userEvent.click(screen.getByRole("button", { name: "Custom" }));
    expect(screen.getByLabelText(/Item name/)).toHaveValue("");
  });
});
