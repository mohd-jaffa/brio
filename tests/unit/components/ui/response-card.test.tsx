import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { ResponseProvider, useResponse, type Respond } from "@/components/ui/response-card";
import { ERROR_MESSAGES } from "@/constants/messages";
import { ApiError } from "@/lib/api/client";

import { sizeCharts } from "@tests/support/charts";

// Hands the test the respond object, with a button to hand focus back to.
function Harness({ onReady }: { onReady: (respond: Respond) => void }) {
  const respond = useResponse();
  const [ready] = useState(() => {
    onReady(respond);
    return true;
  });
  return <button type="button">Screen {String(ready)}</button>;
}

function mount() {
  let respond!: Respond;
  render(
    <ResponseProvider>
      <Harness onReady={(value) => (respond = value)} />
    </ResponseProvider>,
  );
  return respond;
}

const notice = () => document.querySelector<HTMLElement>("[data-response-notice]");
const countdown = () => document.querySelector<HTMLElement>("[data-countdown]")!;

describe("useResponse", () => {
  it("is only for inside a ResponseProvider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Harness onReady={() => {}} />)).toThrow(/ResponseProvider/);
    vi.restoreAllMocks();
  });
});

describe("a card with nothing to do next", () => {
  it("is announced, not focused, and closes itself when its clock runs out", () => {
    const respond = mount();
    act(() => respond.success({ title: "Customer saved", message: "Priya Menon is in your customers." }));
    expect(notice()).toHaveTextContent("Customer saved");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Customer saved. Priya Menon is in your customers.");
    expect(countdown().style.animation).toContain("response-countdown 3000ms");

    fireEvent.animationEnd(countdown());
    expect(notice()).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent("");
  });

  it("stops its clock while a pointer or focus rests on it", () => {
    sizeCharts();
    const respond = mount();
    act(() => respond.info({ title: "You were signed out" }));
    fireEvent.pointerEnter(notice()!);
    expect(countdown().style.animationPlayState).toBe("paused");
    fireEvent.pointerLeave(notice()!);
    expect(countdown().style.animationPlayState).toBe("running");
    fireEvent.focus(screen.getByRole("button", { name: "Close" }));
    expect(countdown().style.animationPlayState).toBe("paused");
    fireEvent.blur(screen.getByRole("button", { name: "Close" }));
    fireEvent.blur(screen.getByRole("button", { name: "Close" }));
    expect(countdown().style.animationPlayState).toBe("running");
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("closes from its close button, and on Escape", async () => {
    const respond = mount();
    act(() => respond.success({ title: "Stock recorded" }));
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(notice()).toBeNull();

    act(() => respond.success({ title: "Stock recorded" }));
    await userEvent.keyboard("{Escape}");
    expect(notice()).toBeNull();
    await userEvent.keyboard("{Enter}");
  });

  it("stays, as a dialog, when told not to close itself", () => {
    const respond = mount();
    act(() => respond.success({ title: "Payment recorded", autoClose: false }));
    expect(screen.getByRole("dialog", { name: "Payment recorded" })).toBeInTheDocument();
    expect(notice()).toBeNull();
  });
});

describe("a card with a next step", () => {
  it("is a dialog with its facts, focused on its primary action", async () => {
    const respond = mount();
    const onNew = vi.fn();
    act(() =>
      respond.success({
        title: "Order placed",
        message: "ORD-1028 is saved and ready to share.",
        facts: [
          { label: "Order", value: "ORD-1028" },
          { label: "Customer", value: "Priya M." },
          { label: "Total", value: "₹1,817" },
          { label: "Ignored", value: "a fourth" },
        ],
        primary: { label: "View bill", href: "/orders/1" },
        secondary: { label: "New order", onClick: onNew },
      }),
    );
    const card = screen.getByRole("dialog", { name: "Order placed" });
    expect(within(card).getByText("ORD-1028 is saved and ready to share.")).toBeInTheDocument();
    expect(within(card).getAllByRole("term").map((term) => term.textContent)).toEqual(["Order", "Customer", "Total"]);
    expect(within(card).getByRole("link", { name: "View bill" })).toHaveAttribute("href", "/orders/1");

    await userEvent.click(within(card).getByRole("button", { name: "New order" }));
    expect(onNew).toHaveBeenCalledOnce();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("puts focus on its primary action, which closes it", async () => {
    const respond = mount();
    const onView = vi.fn();
    act(() => respond.success({ title: "Customer saved", primary: { label: "View customer", onClick: onView } }));
    const view = screen.getByRole("button", { name: "View customer" });
    expect(view).toHaveFocus();
    await userEvent.click(view);
    expect(onView).toHaveBeenCalledOnce();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes when its link is followed", async () => {
    const respond = mount();
    act(() => respond.info({ title: "Signed out", primary: { label: "Sign in", href: "/login" } }));
    const link = screen.getByRole("link", { name: "Sign in" });
    link.addEventListener("click", (event) => event.preventDefault());
    await userEvent.click(link);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("an error card", () => {
  it("is an alertdialog with the API's words, the request id and Try again", async () => {
    const respond = mount();
    const retry = vi.fn();
    act(() =>
      respond.failure(new ApiError(503, "INTERNAL_ERROR", "We couldn't reach the server.", "req_42"), {
        title: "Customer not saved",
        retry,
      }),
    );
    const card = screen.getByRole("alertdialog", { name: "Customer not saved" });
    expect(card).toHaveTextContent("We couldn't reach the server.");
    expect(card).toHaveTextContent("Reference: req_42");
    await userEvent.click(within(card).getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledOnce();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("never shows a raw failure's text, and closes on Escape", async () => {
    const respond = mount();
    act(() => respond.failure(new TypeError("fetch failed at 10.0.0.3"), { title: "Not saved", fallback: "SAVE_FAILED" }));
    const card = screen.getByRole("alertdialog", { name: "Not saved" });
    expect(card).toHaveTextContent(ERROR_MESSAGES.SAVE_FAILED);
    expect(card).not.toHaveTextContent("10.0.0.3");
    expect(card).not.toHaveTextContent("Reference");
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("takes its words directly, with Try again when it can retry", () => {
    const respond = mount();
    act(() => respond.error({ title: "Not enough stock", message: "Only 2 left of Red Velvet Cake.", retry: vi.fn() }));
    expect(screen.getByRole("alertdialog", { name: "Not enough stock" })).toHaveTextContent("Only 2 left");
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("keeps its own actions when it has them", () => {
    const respond = mount();
    act(() =>
      respond.error({ title: "Phone already used", message: "It belongs to Priya.", primary: { label: "Use that customer" } }),
    );
    expect(screen.getByRole("button", { name: "Use that customer" })).toBeInTheDocument();
    act(() => respond.failure(new Error("x"), { title: "Other", primary: { label: "Edit" } }));
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
  });
});

describe("a warning", () => {
  it("waits for a choice: no Escape, no close button", async () => {
    const respond = mount();
    act(() => respond.warning({ title: "Low on flour", primary: { label: "Add stock" } }));
    const card = screen.getByRole("alertdialog", { name: "Low on flour" });
    expect(within(card).queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(card).toBeInTheDocument();
    await userEvent.click(within(card).getByRole("button", { name: "Add stock" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});

describe("a confirmation", () => {
  it("answers yes from its confirm button", async () => {
    const respond = mount();
    let answer: Promise<boolean>;
    act(() => {
      answer = respond.confirm({ title: "Cancel ORD-1028?", message: "Its stock is released.", confirmLabel: "Cancel order", tone: "danger" });
    });
    const card = screen.getByRole("alertdialog", { name: "Cancel ORD-1028?" });
    // A destructive question starts on the safe answer.
    expect(within(card).getByRole("button", { name: "Cancel" })).toHaveFocus();
    expect(within(card).getByRole("button", { name: "Cancel order" })).toHaveClass("bg-danger");
    await userEvent.click(within(card).getByRole("button", { name: "Cancel order" }));
    await expect(answer!).resolves.toBe(true);
  });

  it("answers no from its cancel button, and to Escape", async () => {
    const respond = mount();
    let first: Promise<boolean>;
    act(() => {
      first = respond.confirm({ title: "Delete this expense?", confirmLabel: "Delete", cancelLabel: "Keep it" });
    });
    expect(screen.getByRole("button", { name: "Delete" })).toHaveFocus();
    await userEvent.click(screen.getByRole("button", { name: "Keep it" }));
    await expect(first!).resolves.toBe(false);

    let second: Promise<boolean>;
    act(() => {
      second = respond.confirm({ title: "Delete this expense?", confirmLabel: "Delete" });
    });
    await userEvent.keyboard("{Escape}");
    await expect(second!).resolves.toBe(false);
  });
});

describe("one card at a time", () => {
  it("lets a graver card replace a lighter one, and a lighter one wait", async () => {
    const respond = mount();
    act(() => respond.success({ title: "Customer saved", autoClose: false }));
    act(() => respond.error({ title: "Payment not recorded", message: "Try again later." }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("alertdialog", { name: "Payment not recorded" })).toBeInTheDocument();

    act(() => respond.success({ title: "Stock recorded" }));
    act(() => respond.success({ title: "Stock recorded" }));
    expect(notice()).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(notice()).toHaveTextContent("Stock recorded");
    fireEvent.animationEnd(countdown());
    expect(notice()).toBeNull();
  });

  it("does not stack the same card twice, and answers no to a question it replaced", async () => {
    const respond = mount();
    let question: Promise<boolean>;
    act(() => {
      question = respond.confirm({ title: "Cancel?", confirmLabel: "Yes" });
    });
    let repeat: Promise<boolean>;
    act(() => {
      repeat = respond.confirm({ title: "Cancel?", confirmLabel: "Yes" });
    });
    await expect(repeat!).resolves.toBe(false);
    expect(screen.getAllByRole("alertdialog")).toHaveLength(1);

    act(() => {
      void respond.confirm({ title: "Delete?", confirmLabel: "Delete" });
    });
    await expect(question!).resolves.toBe(false);
    expect(screen.getByRole("alertdialog", { name: "Delete?" })).toBeInTheDocument();
  });
});

describe("a card on its way out", () => {
  const leaveWithMotion = () => {
    vi.useFakeTimers();
    HTMLElement.prototype.animate = vi.fn();
  };
  const settle = () => {
    Reflect.deleteProperty(HTMLElement.prototype, "animate");
    vi.useRealTimers();
  };

  it("drops away before it is taken off, a notice and a card alike", async () => {
    leaveWithMotion();
    const respond = mount();
    act(() => respond.success({ title: "Stock recorded" }));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(notice()).toHaveClass("animate-leave", "pointer-events-none");
    act(() => vi.advanceTimersByTime(200));
    expect(notice()).toBeNull();

    let answer: Promise<boolean> | undefined;
    act(() => {
      answer = respond.confirm({ title: "Cancel this order?", confirmLabel: "Cancel order" });
    });
    fireEvent.click(screen.getByRole("button", { name: "Cancel order" }));
    // The answer is given at once; the card closes, and is gone once it has left.
    await expect(answer).resolves.toBe(true);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(document.querySelector("dialog")).not.toBeNull();
    act(() => vi.advanceTimersByTime(200));
    expect(document.querySelector("dialog")).toBeNull();
    settle();
  });

  it("lets the card waiting behind it follow once it has gone", () => {
    leaveWithMotion();
    const respond = mount();
    act(() => respond.error({ title: "Order not placed", message: "Try again." }));
    act(() => respond.success({ title: "Stock recorded" }));
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Close" }));
    expect(notice()).toBeNull();
    act(() => vi.advanceTimersByTime(200));
    expect(notice()).toHaveTextContent("Stock recorded");
    settle();
  });

  it("gives way at once to a new card, even one just like it", () => {
    leaveWithMotion();
    const respond = mount();
    act(() => respond.success({ title: "Stock recorded" }));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    act(() => respond.success({ title: "Stock recorded" }));
    expect(notice()).not.toHaveClass("animate-leave");
    expect(notice()).toHaveTextContent("Stock recorded");
    act(() => vi.advanceTimersByTime(200));
    expect(notice()).toHaveTextContent("Stock recorded");
    settle();
  });
});
