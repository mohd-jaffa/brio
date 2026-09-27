import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ActionRow } from "@/components/ui/action-row";

describe("ActionRow", () => {
  it("is one button: its mark, its title and the line under it", async () => {
    const onClick = vi.fn();
    render(<ActionRow leading={<span data-testid="mark" />} title="Add custom item" subtitle="A name and an amount" onClick={onClick} />);
    const row = screen.getByRole("button", { name: /Add custom item/ });
    expect(row).toHaveAttribute("type", "button");
    expect(row).toHaveTextContent("A name and an amount");
    expect(row).toContainElement(screen.getByTestId("mark"));
    await userEvent.click(row);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("cuts long lines short unless they must be read whole, and takes a name and a description", () => {
    const { rerender } = render(
      <ActionRow leading={null} title="Meena Gupta" subtitle="+91 98765 43210" aria-label="Change customer: Meena Gupta" aria-describedby="why" />,
    );
    const row = screen.getByRole("button", { name: "Change customer: Meena Gupta" });
    expect(row).toHaveAttribute("aria-describedby", "why");
    expect(screen.getByText("Meena Gupta")).toHaveClass("truncate");

    rerender(<ActionRow leading={null} title="Add custom item" subtitle="A hint to read whole" wrap />);
    expect(screen.getByText("A hint to read whole")).not.toHaveClass("truncate");
  });
});
