import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { GuestMark } from "@/components/ui/guest-mark";

describe("GuestMark", () => {
  it("is a decorative figure the size of an avatar, since Guest is written beside it", () => {
    const { container } = render(<GuestMark />);
    const mark = container.firstElementChild;
    expect(mark).toHaveAttribute("aria-hidden", "true");
    expect(mark?.querySelector("svg")).not.toBeNull();
  });
});
