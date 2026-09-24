import { render, screen } from "@testing-library/react";
import { Package } from "lucide-react";
import { describe, expect, it } from "vitest";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";

describe("PageHeader", () => {
  it("is the screen's one first-level heading", () => {
    render(
      <PageHeader icon={Package} title="Inventory" subtitle="Manage your stock">
        <Button label="Add" />
      </PageHeader>,
    );

    expect(screen.getByRole("heading", { level: 1, name: /Inventory/ })).toBeInTheDocument();
    expect(screen.getByText("Manage your stock")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  });
});
