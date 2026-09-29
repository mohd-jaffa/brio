import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { Modal } from "@/components/ui/modal";
import { topLayer } from "@/components/ui/top-layer";

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

  it("begins at a control Tab stops at, not one a radio group keeps out of the Tab order (audit A3)", () => {
    render(
      <Modal open labelledBy="title">
        <h2 id="title">Choose</h2>
        <div role="radiogroup" aria-label="Pictures">
          <button type="button" role="radio" aria-checked="false" tabIndex={-1}>
            Price tag
          </button>
          <button type="button" role="radio" aria-checked="true" tabIndex={0}>
            Teddy bear
          </button>
        </div>
      </Modal>,
    );
    expect(screen.getByRole("radio", { name: "Teddy bear" })).toHaveFocus();
  });

  it("takes a dialog the browser already opened, or already closed, as it finds it", () => {
    const { rerender } = render(
      <Modal open={false} labelledBy="t">
        <h2 id="t">Choose</h2>
      </Modal>,
    );
    const dialog = document.querySelector("dialog")!;
    dialog.showModal();
    rerender(
      <Modal open labelledBy="t">
        <h2 id="t">Choose</h2>
      </Modal>,
    );
    expect(dialog).toHaveAttribute("open");

    dialog.close();
    rerender(
      <Modal open={false} labelledBy="t">
        <h2 id="t">Choose</h2>
      </Modal>,
    );
    expect(dialog).not.toHaveAttribute("open");
  });

  it("leaves a modal opened from inside it to answer its own Escape and Tab", async () => {
    const outer = vi.fn();
    function Nested() {
      const [picking, setPicking] = useState(false);
      return (
        <Modal open onDismiss={outer} labelledBy="form">
          <h2 id="form">New product</h2>
          <button type="button" onClick={() => setPicking(true)}>
            Change picture
          </button>
          <Modal open={picking} onDismiss={() => setPicking(false)} labelledBy="picker">
            <h2 id="picker">Choose a picture</h2>
            <button type="button">Cake</button>
            <button type="button">Bread</button>
          </Modal>
        </Modal>
      );
    }
    render(<Nested />);
    vi.spyOn(HTMLElement.prototype, "getClientRects").mockReturnValue([{}] as unknown as DOMRectList);
    const opener = screen.getByRole("button", { name: "Change picture" });
    await userEvent.click(opener);
    const picker = screen.getByRole("dialog", { name: "Choose a picture" });
    expect(screen.getByRole("button", { name: "Cake" })).toHaveFocus();

    // Tab goes round inside the picker, not the form it sits in.
    screen.getByRole("button", { name: "Bread" }).focus();
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Cake" })).toHaveFocus();

    await userEvent.keyboard("{Escape}");
    expect(picker).not.toHaveAttribute("open");
    expect(outer).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "New product" })).toHaveAttribute("open");
    expect(opener).toHaveFocus();
    vi.restoreAllMocks();
  });

  it("rises rather than slides when asked", () => {
    render(
      <Modal open labelledBy="t" motion="rise" role="alertdialog">
        <h2 id="t">Done</h2>
      </Modal>,
    );
    const dialog = screen.getByRole("alertdialog", { name: "Done" });
    expect(dialog).toHaveClass("modal-rise");
    expect(dialog).not.toHaveClass("modal-slide");
  });

  it("keeps Tab going round inside it, both ways", async () => {
    // jsdom lays nothing out; here every control is drawn.
    vi.spyOn(Element.prototype, "getClientRects").mockReturnValue([{}] as unknown as DOMRectList);
    render(
      <Modal open labelledBy="title">
        <h2 id="title">Choose</h2>
        <button type="button">First</button>
        <button type="button">Last</button>
      </Modal>,
    );
    expect(screen.getByRole("button", { name: "First" })).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(screen.getByRole("button", { name: "Last" })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "First" })).toHaveFocus();
    vi.restoreAllMocks();
  });

  it("is the layer on top while it is open, with a place for a notice and a live region inside it", () => {
    const { rerender, unmount } = render(
      <Modal open labelledBy="title">
        <h2 id="title">Record stock</h2>
      </Modal>,
    );
    const dialog = screen.getByRole("dialog", { name: "Record stock" });
    const layer = topLayer()!;
    expect(dialog).toContainElement(layer.notices);
    expect(dialog).toContainElement(layer.status);
    expect(layer.status).toHaveAttribute("role", "status");
    expect(layer.status).toHaveAttribute("aria-live", "polite");

    rerender(
      <Modal open={false} labelledBy="title">
        <h2 id="title">Record stock</h2>
      </Modal>,
    );
    expect(topLayer()).toBeUndefined();

    rerender(
      <Modal open labelledBy="title">
        <h2 id="title">Record stock</h2>
      </Modal>,
    );
    expect(topLayer()).toBeDefined();
    unmount();
    expect(topLayer()).toBeUndefined();
  });
});
