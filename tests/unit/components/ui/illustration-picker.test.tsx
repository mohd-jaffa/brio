import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { IllustrationPicker } from "@/components/ui/illustration-picker";
import { ILLUSTRATION_GROUPS, ILLUSTRATION_KEYS, ILLUSTRATIONS } from "@/constants/illustrations";

// The library as it is drawn, group by group: the order the arrow keys walk.
const DRAWN = ILLUSTRATION_GROUPS.flatMap((group) => ILLUSTRATION_KEYS.filter((key) => ILLUSTRATIONS[key].group === group));

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
      "Hearts and love",
      "Food",
      "Home and everyday",
      "Characters",
    ]);
    const choices = within(picker).getAllByRole("radio");
    expect(choices).toHaveLength(ILLUSTRATION_KEYS.length);
    expect(choices[0]).toHaveAccessibleName("Price tag");
    expect(within(within(picker).getByRole("region", { name: "Food" })).getAllByRole("radio")).toHaveLength(3);
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

  it("enters at the picture in use, its one Tab stop (audit A3)", () => {
    const { picker } = open("teddy-bear");
    const teddy = within(picker).getByRole("radio", { name: "Teddy bear" });
    expect(teddy).toHaveFocus();
    expect(within(picker).getAllByRole("radio").filter((radio) => radio.tabIndex === 0)).toEqual([teddy]);
  });

  it("walks the library with the arrow keys, the mark and focus together, choosing nothing until Enter", async () => {
    const { picker, onPick, onClose } = open("teddy-bear");
    const radios = within(picker).getAllByRole("radio");
    const at = DRAWN.indexOf("teddy-bear");

    await userEvent.keyboard("{ArrowRight}{ArrowDown}");
    expect(radios[at + 2]).toHaveFocus();
    expect(radios[at + 2]).toHaveAttribute("aria-checked", "true");
    expect(within(picker).getAllByRole("radio", { checked: true })).toHaveLength(1);
    expect(onPick).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();

    await userEvent.keyboard("{ArrowUp}{Enter}");
    expect(onPick).toHaveBeenCalledExactlyOnceWith(DRAWN[at + 1]);
    expect(onClose).toHaveBeenCalled();
  });

  it("wraps round at either end, and Home and End go to the first and the last", async () => {
    const { picker } = open(null);
    const radios = within(picker).getAllByRole("radio");
    await userEvent.keyboard("{ArrowLeft}");
    expect(radios.at(-1)).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    expect(radios[0]).toHaveFocus();
    await userEvent.keyboard("{End}");
    expect(radios.at(-1)).toHaveFocus();
    await userEvent.keyboard("{Home}");
    expect(radios[0]).toHaveFocus();
  });

  it("starts again from the picture in use each time it opens", async () => {
    const onPick = vi.fn();
    const { rerender } = render(<IllustrationPicker open value="teddy-bear" fallback="default-product" onPick={onPick} onClose={vi.fn()} />);
    await userEvent.keyboard("{ArrowRight}{ArrowRight}");
    rerender(<IllustrationPicker open={false} value="teddy-bear" fallback="default-product" onPick={onPick} onClose={vi.fn()} />);
    rerender(<IllustrationPicker open value="teddy-bear" fallback="default-product" onPick={onPick} onClose={vi.fn()} />);
    expect(screen.getByRole("radio", { name: "Teddy bear" })).toHaveAttribute("aria-checked", "true");
    expect(onPick).not.toHaveBeenCalled();
  });
});
