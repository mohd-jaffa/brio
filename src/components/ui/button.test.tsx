import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Plus, Trash2 } from "lucide-react";
import { describe, expect, it, vi } from "vitest";

import { Button, IconButton, LinkButton } from "./button";

describe("Button", () => {
  it("shows its label and calls back when pressed", async () => {
    const onClick = vi.fn();
    render(<Button label="Add Customer" onClick={onClick} />);

    await userEvent.click(screen.getByRole("button", { name: "Add Customer" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("is a plain button unless it is told otherwise, so it never submits a form by accident", () => {
    render(<Button label="Cancel" />);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });

  it("submits when it is a form's submit button", () => {
    render(<Button type="submit" label="Save" />);
    expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
  });

  it("refuses further presses while it is working, and says it is busy", async () => {
    const onClick = vi.fn();
    render(<Button label="Save" loading onClick={onClick} />);

    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");

    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("keeps a 44px touch target whatever its size", () => {
    render(<Button label="Adjust" size="sm" />);
    expect(screen.getByRole("button").className).toContain("touch-target");
  });

  it("hides its icon from a screen reader — the label already says it", () => {
    const { container } = render(<Button label="Add" icon={Plus} />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("renders children in place of a label", () => {
    render(<Button>Custom</Button>);
    expect(screen.getByRole("button", { name: "Custom" })).toBeInTheDocument();
  });
});

describe("LinkButton", () => {
  it("stays a link, so it can be opened in a new tab", () => {
    render(<LinkButton href="/orders/new" label="Create Order" icon={Plus} />);

    const link = screen.getByRole("link", { name: "Create Order" });
    expect(link).toHaveAttribute("href", "/orders/new");
  });
});

describe("IconButton", () => {
  it("names itself, because the icon alone says nothing", async () => {
    const onClick = vi.fn();
    render(<IconButton icon={Trash2} label="Remove item 1" onClick={onClick} tone="danger" />);

    const button = screen.getByRole("button", { name: "Remove item 1" });
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });
});
