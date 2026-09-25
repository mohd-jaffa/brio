import { render } from "@testing-library/react";
import { ShoppingBag } from "lucide-react";
import { describe, expect, it } from "vitest";

import { Medallion, type MedallionTone } from "@/components/ui/medallion";

describe("Medallion", () => {
  it("sets the icon at a 1.75 stroke in a primary-soft circle, hidden from screen readers", () => {
    const { container } = render(<Medallion icon={ShoppingBag} />);
    const circle = container.firstElementChild!;
    expect(circle).toHaveAttribute("aria-hidden", "true");
    expect(circle).toHaveClass("bg-primary-soft", "text-primary", "size-11");
    expect(circle.querySelector("svg")).toHaveAttribute("stroke-width", "1.75");
  });

  it.each<[MedallionTone, string]>([
    ["neutral", "bg-sunken"],
    ["success", "bg-success-bg"],
    ["warning", "bg-warning-bg"],
    ["danger", "bg-danger-bg"],
  ])("takes the %s tint", (tone, tint) => {
    const { container } = render(<Medallion icon={ShoppingBag} tone={tone} size="lg" className="mb-2" />);
    expect(container.firstElementChild).toHaveClass(tint, "size-14", "mb-2");
    expect(container.querySelector("svg")).toHaveAttribute("width", "28");
  });

  it("comes small", () => {
    const { container } = render(<Medallion icon={ShoppingBag} size="sm" />);
    expect(container.firstElementChild).toHaveClass("size-9");
  });
});
