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

    expect(screen.getByRole("heading", { name: "No customers yet" })).toBeInTheDocument();
    expect(screen.getByText("Start adding your customers.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Add Your First Customer" }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
