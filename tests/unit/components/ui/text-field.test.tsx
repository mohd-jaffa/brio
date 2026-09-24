import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  optionsFrom,
  optionsOf,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/ui/text-field";

describe("TextField", () => {
  it("ties its label to its input, so clicking the label focuses the field", async () => {
    render(<TextField label="Full Name" />);

    await userEvent.click(screen.getByText("Full Name"));
    expect(screen.getByLabelText("Full Name")).toHaveFocus();
  });

  it("announces a validation message and points the field at it", () => {
    render(<TextField label="Phone Number" error="Enter a valid mobile number." />);

    const input = screen.getByLabelText("Phone Number");
    const message = screen.getByRole("alert");

    expect(message).toHaveTextContent("Enter a valid mobile number.");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", message.id);
  });

  it("says nothing when nothing is wrong", () => {
    render(<TextField label="Email" />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("marks a required field for assistive technology, not only visually", () => {
    render(<TextField label="Full Name" required />);
    expect(screen.getByRole("textbox")).toHaveAttribute("aria-required", "true");
  });

  it("shows a hint until there is a message to show instead", () => {
    const { rerender } = render(<TextField label="Quantity" hint="Enter a plain count." />);
    expect(screen.getByText("Enter a plain count.")).toBeInTheDocument();

    rerender(<TextField label="Quantity" hint="Enter a plain count." error="Quantity needs a value." />);
    expect(screen.queryByText("Enter a plain count.")).not.toBeInTheDocument();
  });

  it("passes what is typed on to its caller", async () => {
    const onChange = vi.fn();
    render(<TextField label="Search" onChange={onChange} />);

    await userEvent.type(screen.getByLabelText("Search"), "cake");
    expect(onChange).toHaveBeenCalled();
  });
});

describe("TextAreaField", () => {
  it("is a labelled multi-line field that reports its own errors", () => {
    render(<TextAreaField label="Address" error="Address can be at most 500 characters." />);

    expect(screen.getByLabelText("Address").tagName).toBe("TEXTAREA");
    expect(screen.getByRole("alert")).toHaveTextContent("at most 500");
  });
});

describe("SelectField", () => {
  const options = [
    { value: "CASH", label: "Cash" },
    { value: "UPI", label: "UPI" },
  ];

  it("offers what it was given and reports the choice", async () => {
    const onChange = vi.fn();
    render(<SelectField label="Paid With" options={options} onChange={onChange} />);

    await userEvent.selectOptions(screen.getByLabelText("Paid With"), "UPI");
    expect(onChange).toHaveBeenCalled();
    expect(screen.getByRole("option", { name: "Cash" })).toBeInTheDocument();
  });

  it("can start on a placeholder that is not a real choice", () => {
    render(<SelectField label="Customer" options={options} placeholder="Choose a customer…" />);
    expect(screen.getByRole("option", { name: "Choose a customer…" })).toHaveValue("");
  });
});

describe("the option builders", () => {
  it("pairs each stored value with the words a baker reads", () => {
    expect(optionsFrom(["CASH", "UPI"] as const, { CASH: "Cash", UPI: "UPI" })).toEqual([
      { value: "CASH", label: "Cash" },
      { value: "UPI", label: "UPI" },
    ]);
  });

  it("uses the value as the label where there is no separate wording", () => {
    expect(optionsOf(["Ingredients"])).toEqual([{ value: "Ingredients", label: "Ingredients" }]);
  });
});
