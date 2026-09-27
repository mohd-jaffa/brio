import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { JsonBlock } from "@/features/admin/components/JsonBlock";

describe("JsonBlock", () => {
  it("shows a stored value as indented JSON, under its label", () => {
    render(<JsonBlock label="After" value={{ status: "READY", items: [1] }} />);
    const figure = screen.getByRole("figure", { name: "After" });
    expect(figure.querySelector("pre")?.textContent).toBe(JSON.stringify({ status: "READY", items: [1] }, null, 2));
  });

  it("says Nothing when there is nothing", () => {
    const { rerender } = render(<JsonBlock label="Before" value={null} />);
    expect(screen.getByRole("figure", { name: "Before" })).toHaveTextContent("Nothing");
    rerender(<JsonBlock label="Before" value={undefined} />);
    expect(screen.getByRole("figure", { name: "Before" })).toHaveTextContent("Nothing");
  });
});
