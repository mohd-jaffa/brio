import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Avatar, initials, tintIndex } from "@/components/ui/avatar";

describe("initials", () => {
  it("takes the first letters of the first and last words", () => {
    expect(initials("Priya Menon")).toBe("PM");
    expect(initials("  anita   k  joseph ")).toBe("AJ");
    expect(initials("Asha")).toBe("A");
    expect(initials("   ")).toBe("");
  });

  it("keeps a whole letter, not half of one", () => {
    expect(initials("क्षमा शर्मा")).toBe("क्षश");
    expect(initials("👩🏽‍🍳 Baker")).toBe("👩🏽‍🍳B");
  });
});

describe("tintIndex", () => {
  it("always gives the same name the same tint, whatever its case or spacing", () => {
    expect(tintIndex("Priya Menon")).toBe(tintIndex("  priya menon "));
    const tints = new Set(
      ["Priya Menon", "Aisha Khan", "Neha Suresh", "Rohan Das", "Anita Joseph"].map((name) => tintIndex(name)),
    );
    expect(tints.size).toBeGreaterThan(1);
    for (const tint of tints) expect(tint).toBeGreaterThanOrEqual(0);
    expect(tintIndex("Priya Menon", 3)).toBeLessThan(3);
  });
});

describe("Avatar", () => {
  it("shows the initials on the name's tint, hidden from screen readers", () => {
    const { container } = render(<Avatar name="Priya Menon" className="ring-2" />);
    const avatar = container.firstElementChild as HTMLElement;
    expect(avatar).toHaveTextContent("PM");
    expect(avatar).toHaveAttribute("aria-hidden", "true");
    expect(avatar).toHaveClass("size-11", "ring-2");
    const tint = `var(--color-chart-${tintIndex("Priya Menon") + 1})`;
    expect(avatar.style.background).toBe(`color-mix(in oklab, ${tint} 20%, var(--color-surface))`);
    expect(avatar.style.color).toBe(`color-mix(in oklab, ${tint} 40%, var(--color-text))`);
  });

  it("comes in three sizes", () => {
    const { container } = render(
      <>
        <Avatar name="A" size="sm" />
        <Avatar name="B" size="lg" />
      </>,
    );
    expect(container.children[0]).toHaveClass("size-9");
    expect(container.children[1]).toHaveClass("size-16");
  });
});
