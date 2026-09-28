import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Users } from "lucide-react";
import { describe, expect, it, vi } from "vitest";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

describe("EmptyState", () => {
  it("says what is missing, why it matters, and how to start", async () => {
    const onClick = vi.fn();
    render(
      <EmptyState
        icon={Users}
        title="No customers yet"
        hint="Start adding your customers."
        action={<Button label="Add Your First Customer" onClick={onClick} />}
      />,
    );

    expect(screen.getByRole("heading", { name: "No customers yet" })).toHaveClass("font-heading");
    expect(document.querySelector('[aria-hidden="true"]')).toHaveClass("bg-primary-soft");
    expect(screen.getByText("Start adding your customers.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Add Your First Customer" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("draws what is missing in place of the icon, as decoration, settling in", () => {
    const { container } = render(<EmptyState art="people" title="No customers yet" />);

    const drawing = container.querySelector("img")!;
    expect(drawing).toHaveAttribute("alt", "");
    expect(drawing.getAttribute("src")).toContain("people.webp");
    expect(drawing.parentElement).toHaveClass("animate-drop-in");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(container.querySelector(".bg-primary-soft")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "No customers yet" })).toBeInTheDocument();
  });
});
