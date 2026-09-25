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

  it("shows a hint until there is a message to show instead, and reads whichever is shown", () => {
    const { rerender } = render(<TextField label="Quantity" hint="Enter a plain count." />);
    expect(screen.getByText("Enter a plain count.")).toBeInTheDocument();
    expect(screen.getByLabelText("Quantity")).toHaveAccessibleDescription("Enter a plain count.");

    rerender(<TextField label="Quantity" hint="Enter a plain count." error="Quantity needs a value." />);
    expect(screen.queryByText("Enter a plain count.")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Quantity")).toHaveAccessibleDescription("Quantity needs a value.");
  });

  it("reads the prefix, then the hint", () => {
    render(<TextField label="Business phone" prefix="+91" hint="Printed on your bills." />);
    expect(screen.getByLabelText("Business phone")).toHaveAccessibleDescription("+91 Printed on your bills.");
  });

  it("passes what is typed on to its caller", async () => {
    const onChange = vi.fn();
    render(<TextField label="Search" onChange={onChange} />);

    await userEvent.type(screen.getByLabelText("Search"), "cake");
    expect(onChange).toHaveBeenCalled();
  });
});

describe("the field kit's labels and adornments", () => {
  it("sets labels in sentence case, with the required mark hidden from a screen reader", () => {
    render(<TextField label="Full name" required />);
    const label = screen.getByText("Full name");
    expect(label).toHaveClass("text-sm", "font-medium");
    expect(label).not.toHaveClass("uppercase");
    expect(label.querySelector('[aria-hidden="true"]')).toHaveTextContent("*");
  });

  it("says a field is optional, in the label a screen reader reads", () => {
    render(
      <>
        <TextField label="Email" optional />
        <TextAreaField label="Notes" optional />
        <SelectField label="Category" optional options={[]} />
      </>,
    );
    expect(screen.getByLabelText("Email (Optional)")).toBeInTheDocument();
    expect(screen.getByLabelText("Notes (Optional)")).toBeInTheDocument();
    expect(screen.getByLabelText("Category (Optional)")).toBeInTheDocument();
  });

  it("puts +91 before a phone number, and reads it out with the field and any message", () => {
    render(<TextField label="Mobile number" prefix="+91" error="Enter a valid mobile number." />);
    const field = screen.getByLabelText("Mobile number");
    expect(field).toHaveClass("pl-16");
    expect(field).toHaveAccessibleDescription("+91 Enter a valid mobile number.");
  });

  it("makes room for both an icon and the prefix", () => {
    render(<TextField label="Mobile number" prefix="+91" leading={<svg />} />);
    expect(screen.getByLabelText("Mobile number")).toHaveClass("pl-[5.75rem]");
    expect(screen.getByText("+91")).toHaveClass("left-12");
  });
});

describe("TextAreaField", () => {
  it("is a labelled multi-line field that reports its own errors", () => {
    render(<TextAreaField label="Address" error="Address can be at most 500 characters." />);

    expect(screen.getByLabelText("Address").tagName).toBe("TEXTAREA");
    expect(screen.getByRole("alert")).toHaveTextContent("at most 500");
  });

  it("reads its hint with it", () => {
    render(<TextAreaField label="Address" hint="Where the bill says you are." />);
    expect(screen.getByLabelText("Address")).toHaveAccessibleDescription("Where the bill says you are.");
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

  it("reads its hint with it, or its message in the hint's place", () => {
    const { rerender } = render(<SelectField label="Paid With" options={options} hint="How the money came in." />);
    expect(screen.getByLabelText("Paid With")).toHaveAccessibleDescription("How the money came in.");

    rerender(<SelectField label="Paid With" options={options} hint="How the money came in." error="Choose a method." />);
    expect(screen.getByLabelText("Paid With")).toHaveAccessibleDescription("Choose a method.");
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
