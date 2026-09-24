import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FieldError } from "@/components/ui/field-error";

describe("FieldError", () => {
  it("says nothing when nothing is wrong", () => {
    const { container } = render(<FieldError />);
    expect(container).toBeEmptyDOMElement();
  });

  it("announces the message when there is one", () => {
    render(<FieldError id="e1" message="Name needs a value." />);
    expect(screen.getByRole("alert")).toHaveTextContent("Name needs a value.");
  });
});
