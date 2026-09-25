import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BillHeaderPreview } from "@/features/business/components/BillHeaderPreview";

const typed = {
  name: " Sweet Delights ",
  tagline: "Cakes for every celebration",
  address: "12 MG Road\nCamp",
  city: "Pune",
  phone: "9876543210",
  logoUrl: null,
};

describe("BillHeaderPreview", () => {
  it("reads as the top of a bill: name, catch phrase, address, city and the number with +91", () => {
    render(<BillHeaderPreview {...typed} />);
    const preview = screen.getByRole("figure", { name: "Bill header preview" });
    expect(within(preview).getByText("Sweet Delights")).toBeInTheDocument();
    expect(within(preview).getByText("Cakes for every celebration")).toBeInTheDocument();
    expect(within(preview).getByText(/12 MG Road\s+Camp\s+Pune\s+\+91 98765 43210/)).toBeInTheDocument();
  });

  it("leaves out what has not been filled in, and holds the name's place", () => {
    const { container } = render(<BillHeaderPreview name="  " tagline={null} address="" logoUrl={null} />);
    expect(screen.getByText("Business name")).toHaveClass("text-text-muted");
    expect(container.querySelector("p.italic")).not.toBeInTheDocument();
    expect(container.querySelector("p.whitespace-pre-line")).not.toBeInTheDocument();
  });
});
