import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Modal } from "@/components/ui/modal";

describe("Modal", () => {
  it("stays open to Escape and the backdrop when nothing dismisses it", async () => {
    render(
      <Modal open labelledBy="title">
        <h2 id="title">Choose</h2>
        <button type="button">Yes</button>
      </Modal>,
    );
    const dialog = screen.getByRole("dialog", { name: "Choose" });
    // With no scope given, the first control anywhere in it takes focus.
    expect(screen.getByRole("button", { name: "Yes" })).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    fireEvent.click(dialog);
    expect(dialog).toHaveAttribute("open");
  });

  it("rises rather than slides when asked", () => {
    render(
      <Modal open labelledBy="t" motion="rise" role="alertdialog">
        <h2 id="t">Done</h2>
      </Modal>,
    );
    const dialog = screen.getByRole("alertdialog", { name: "Done" });
    expect(dialog).toHaveClass("animate-response");
    expect(dialog).not.toHaveClass("animate-slide-up");
  });
});
