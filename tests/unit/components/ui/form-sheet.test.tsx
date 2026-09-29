import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { FormSheet } from "@/components/ui/form-sheet";
import { TextField } from "@/components/ui/text-field";

function open(overrides: Partial<Parameters<typeof FormSheet>[0]> = {}) {
  const props = {
    open: true,
    title: "New Customer",
    onClose: vi.fn(),
    onSubmit: vi.fn(),
    submitLabel: "Save Customer",
    ...overrides,
  };
  render(
    <FormSheet {...props}>
      <TextField label="Full Name" />
    </FormSheet>,
  );
  return props;
}

describe("FormSheet", () => {
  it("stays mounted but out of sight while it is closed, so its form keeps what was typed", () => {
    const { container } = render(
      <FormSheet open={false} title="New Customer" onClose={vi.fn()} onSubmit={vi.fn()} submitLabel="Save">
        <TextField label="Full Name" />
      </FormSheet>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(container.querySelector("dialog")).not.toHaveAttribute("open");
    expect(container.querySelector("input")).toBeInTheDocument();
  });

  it("posts if sent before the page has loaded, so nothing typed lands in the address", () => {
    open();
    const form = screen.getByLabelText("Full Name").closest("form");
    expect(form).toHaveAttribute("method", "post");
    expect(form).not.toHaveAttribute("action");
  });

  it("is a dialog named by its heading", () => {
    open();
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleName("New Customer");
  });

  it("puts the cursor in the first field, so typing can start straight away", () => {
    open();
    expect(screen.getByLabelText("Full Name")).toHaveFocus();
  });

  it("closes on Escape", async () => {
    const props = open();
    await userEvent.keyboard("{Escape}");
    expect(props.onClose).toHaveBeenCalledOnce();
  });

  it("closes from its close button", async () => {
    const props = open();
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(props.onClose).toHaveBeenCalledOnce();
  });

  it("submits from the footer button, which sits outside the scrolling body", async () => {
    const props = open();
    await userEvent.click(screen.getByRole("button", { name: "Save Customer" }));
    expect(props.onSubmit).toHaveBeenCalledOnce();
  });

  it("stops the page behind it scrolling while it is open", () => {
    open();
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("shows that it is saving and refuses a second submit", async () => {
    const props = open({ submitting: true });
    const button = screen.getByRole("button", { name: /Saving/ });

    expect(button).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(button);
    expect(props.onSubmit).not.toHaveBeenCalled();
  });
});
