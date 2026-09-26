import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { IllustrationPicker } from "@/components/ui/illustration-picker";
import { ILLUSTRATION_KEYS } from "@/constants/illustrations";

function open(value: string | null, fallback: "default-product" | "default-expense" = "default-product") {
  const onPick = vi.fn();
  const onClose = vi.fn();
  const { unmount } = render(<IllustrationPicker open value={value} fallback={fallback} onPick={onPick} onClose={onClose} />);
  return { onPick, onClose, unmount, picker: screen.getByRole("dialog", { name: "Choose a picture" }) };
}

describe("IllustrationPicker", () => {
  it("offers the whole library in its groups, the defaults first, each named by its label (§139.11.10)", () => {
    const { picker } = open(null);
    expect(within(picker).getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent)).toEqual([
      "Basics",
      "Bakes and sweets",
      "Gifts and flowers",
      "Food",
    ]);
    const choices = within(picker).getAllByRole("radio");
    expect(choices).toHaveLength(ILLUSTRATION_KEYS.length);
    expect(choices[0]).toHaveAccessibleName("Price tag");
    expect(within(within(picker).getByRole("region", { name: "Food" })).getAllByRole("radio")).toHaveLength(2);
  });

  it("marks the picture in use, the default when there is none or the key is unknown", () => {
    const { unmount } = open("teddy-bear");
    expect(screen.getByRole("radio", { name: "Teddy bear" })).toHaveAttribute("aria-checked", "true");
    unmount();

    const again = open(null, "default-expense");
    expect(within(again.picker).getByRole("radio", { name: "Receipt" })).toHaveAttribute("aria-checked", "true");
    expect(within(again.picker).getAllByRole("radio", { checked: true })).toHaveLength(1);
  });

  it("hands back the key chosen, and closes", async () => {
    const { onPick, onClose } = open("unknown-key");
    expect(screen.getByRole("radio", { name: "Price tag" })).toHaveAttribute("aria-checked", "true");
    await userEvent.click(screen.getByRole("radio", { name: "Taco" }));
    expect(onPick).toHaveBeenCalledWith("taco");
    expect(onClose).toHaveBeenCalled();
  });
});
