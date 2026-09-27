import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Plus, Trash2 } from "lucide-react";
import { describe, expect, it, vi } from "vitest";

import { Button, IconButton, LinkButton } from "@/components/ui/button";

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
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).toHaveAttribute("aria-busy", "true");

    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("keeps focus while it is busy, so nothing loses its place", () => {
    const { rerender } = render(<Button label="Save" />);
    const button = screen.getByRole("button");
    button.focus();
    rerender(<Button label="Save" loading />);
    expect(button).not.toBeDisabled();
    expect(button).toHaveFocus();
  });

  it("does not submit its form while busy", async () => {
    const onSubmit = vi.fn((event: Event) => event.preventDefault());
    render(
      <form onSubmit={(event) => onSubmit(event.nativeEvent)}>
        <Button type="submit" label="Save" loading />
      </form>,
    );
    await userEvent.click(screen.getByRole("button"));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("passes a press on when it is not busy", async () => {
    const onClick = vi.fn();
    render(<Button label="Save" onClick={onClick} />);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
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
    expect(link).not.toHaveAttribute("target");
  });

  it("dials or opens a chat beside the app, named in full for a screen reader", () => {
    render(
      <>
        <LinkButton href="tel:+919876543210" label="Call" accessibleName="Call Meena" />
        <LinkButton href="https://wa.me/919876543210" label="WhatsApp" newTab fullWidth />
      </>,
    );
    expect(screen.getByRole("link", { name: "Call Meena" })).toHaveAttribute("href", "tel:+919876543210");
    const chat = screen.getByRole("link", { name: "WhatsApp" });
    expect(chat).toHaveAttribute("target", "_blank");
    expect(chat).toHaveAttribute("rel", "noopener noreferrer");
    expect(chat).toHaveClass("w-full");
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

  it("can be shown with nothing to do, and then does nothing", async () => {
    const onClick = vi.fn();
    render(<IconButton icon={Trash2} label="Previous month" onClick={onClick} disabled />);
    await userEvent.click(screen.getByRole("button", { name: "Previous month" }));
    expect(screen.getByRole("button", { name: "Previous month" })).toBeDisabled();
    expect(onClick).not.toHaveBeenCalled();
  });
});
