import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ScreenNotice } from "@/components/ui/screen-notice";

describe("ScreenNotice", () => {
  it("announces what the screen has to say", () => {
    render(<ScreenNotice>Could not load your customers.</ScreenNotice>);
    expect(screen.getByRole("alert")).toHaveTextContent("Could not load your customers.");
  });
});
