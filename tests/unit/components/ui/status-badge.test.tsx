import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StatusBadge } from "@/components/ui/status-badge";

describe("StatusBadge", () => {
  it("shows the word, in the tone the constants chose for it", () => {
    render(<StatusBadge label="Overdue" tone="danger" />);
    const badge = screen.getByText("Overdue");
    expect(badge.className).toContain("text-danger");
  });

  it("is quiet by default", () => {
    render(<StatusBadge label="Delivered" />);
    expect(screen.getByText("Delivered").className).toContain("text-text-muted");
  });
});
