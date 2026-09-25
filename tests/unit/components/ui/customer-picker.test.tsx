import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { CustomerPicker, type CustomerChoice, type PickedCustomer } from "@/components/ui/customer-picker";

const customers = [
  { id: "c-1", name: "Meena Gupta", phone: "+919876543210" },
  { id: "c-2", name: "Rahul Nair", phone: "+919812345678" },
];

function Screen({
  value = null,
  onPick = vi.fn(),
  onAddNew = vi.fn(),
}: {
  value?: CustomerChoice | null;
  onPick?: (picked: PickedCustomer<(typeof customers)[number]>) => void;
  onAddNew?: () => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Choose
      </button>
      <CustomerPicker
        open={open}
        onClose={() => setOpen(false)}
        customers={customers}
        value={value}
        onPick={onPick}
        onAddNew={onAddNew}
      />
    </>
  );
}

const choices = () => within(screen.getByRole("radiogroup", { name: "Select customer" })).getAllByRole("radio");
const search = () => screen.getByLabelText("Search by name or phone…");

describe("CustomerPicker", () => {
  it("lists Guest first, then every customer with their number", () => {
    render(<Screen />);
    expect(screen.getByRole("dialog", { name: "Select customer" })).toBeInTheDocument();
    const [guest, meena, rahul] = choices();
    expect(guest).toHaveAccessibleName(/Guest/);
    expect(meena).toHaveAccessibleName(/Meena Gupta.*\+91 98765 43210/);
    expect(rahul).toHaveAccessibleName(/Rahul Nair/);
    for (const choice of choices()) expect(choice).toHaveAttribute("aria-checked", "false");
  });

  it("marks the current choice, a Guest or a customer", () => {
    const { unmount } = render(<Screen value={{ kind: "GUEST" }} />);
    expect(choices()[0]).toHaveAttribute("aria-checked", "true");
    expect(choices()[1]).toHaveAttribute("aria-checked", "false");
    unmount();

    render(<Screen value={{ kind: "CUSTOMER", id: "c-2" }} />);
    expect(choices().map((choice) => choice.getAttribute("aria-checked"))).toEqual(["false", "false", "true"]);
  });

  it("finds a customer by name, or by their number however it is typed (BUG-23)", async () => {
    render(<Screen />);
    await userEvent.type(search(), "meena");
    expect(choices()).toHaveLength(2);
    expect(choices()[1]).toHaveAccessibleName(/Meena Gupta/);

    await userEvent.clear(search());
    await userEvent.type(search(), "+91 98123");
    expect(choices()).toHaveLength(2);
    expect(choices()[1]).toHaveAccessibleName(/Rahul Nair/);

    await userEvent.clear(search());
    await userEvent.type(search(), "   ");
    expect(choices()).toHaveLength(3);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("says when no one matches, and keeps Guest on offer", async () => {
    render(<Screen />);
    await userEvent.type(search(), "zzz");
    expect(choices()).toHaveLength(1);
    expect(screen.getByRole("status")).toHaveTextContent("No customer matches that");
  });

  it("closes on a choice, and opens again on the whole list", async () => {
    const onPick = vi.fn();
    render(<Screen onPick={onPick} />);
    await userEvent.type(search(), "rahul");
    await userEvent.click(choices()[1]);
    expect(onPick).toHaveBeenCalledWith({ kind: "CUSTOMER", customer: customers[1] });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Choose" }));
    expect(search()).toHaveValue("");
    await userEvent.click(choices()[0]);
    expect(onPick).toHaveBeenLastCalledWith({ kind: "GUEST" });
  });

  it("hands over to a new customer, forgetting the search", async () => {
    const onAddNew = vi.fn();
    render(<Screen onAddNew={onAddNew} />);
    await userEvent.type(search(), "anu");
    await userEvent.click(screen.getByRole("button", { name: "Add new customer" }));
    expect(onAddNew).toHaveBeenCalledOnce();
    expect(search()).toHaveValue("");
  });
});
