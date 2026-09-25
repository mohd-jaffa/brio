import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";

describe("PageHeader", () => {
  it("is the screen's one first-level heading, with its line and its control", () => {
    render(
      <PageHeader title="Expenses" subtitle="Track your costs">
        <Button label="Add expense" />
      </PageHeader>,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Expenses" })).toBeInTheDocument();
    expect(screen.getByText("Track your costs")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add expense" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Go back" })).not.toBeInTheDocument();
  });

  it("offers a way back where it has somewhere to go back to", () => {
    render(<PageHeader title="Create order" back="/orders" />);
    expect(screen.getByRole("link", { name: "Go back" })).toHaveAttribute("href", "/orders");
  });
});
