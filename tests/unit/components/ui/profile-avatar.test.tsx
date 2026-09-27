import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProfileAvatar } from "@/components/ui/profile-avatar";

describe("ProfileAvatar", () => {
  it("is decoration beside a name — nothing for a screen reader to read twice", () => {
    const { container } = render(<ProfileAvatar avatar="tiger" />);
    const image = container.querySelector("img");
    expect(image).toHaveAttribute("alt", "");
    expect(image?.getAttribute("src")).toMatch(/tiger/);
  });

  it("names the animal where it stands alone", () => {
    render(<ProfileAvatar avatar="polar-bear" labelled />);
    expect(screen.getByRole("img", { name: "Polar bear" })).toBeInTheDocument();
  });

  it("shows the first picture for a key the app does not have, or none", () => {
    const { container, rerender } = render(<ProfileAvatar avatar="dragon" />);
    expect(container.querySelector("img")?.getAttribute("src")).toMatch(/pomeranian/);

    rerender(<ProfileAvatar avatar={null} />);
    expect(container.querySelector("img")?.getAttribute("src")).toMatch(/pomeranian/);
  });

  it("asks for an image the size it is drawn: small in the top bar, large on Settings", () => {
    const { container, rerender } = render(<ProfileAvatar avatar="husky" />);
    expect(container.querySelector("img")).toHaveAttribute("width", "36");

    rerender(<ProfileAvatar avatar="husky" size="lg" />);
    expect(container.querySelector("img")).toHaveAttribute("width", "80");
    expect(container.querySelector("img")).toHaveAttribute("height", "80");
  });
});
