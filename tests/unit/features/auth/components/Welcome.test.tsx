import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { UI_TEXT } from "@/constants/messages";
import { WELCOME_LEAVE_MS, WELCOME_SWIPE_PX, Welcome } from "@/features/auth/components/Welcome";
import type { AuthProfile } from "@/features/auth/types";

import { authStub, TEST_PROFILE } from "@tests/support/auth";

const { useAuth, markWelcomed, business } = vi.hoisted(() => ({
  useAuth: vi.fn(),
  markWelcomed: vi.fn(),
  business: { data: { name: "Asha’s Home Bakes" } as { name: string } | undefined },
}));
vi.mock("@/features/auth/AuthProvider", () => ({ useAuth }));
vi.mock("@/features/auth/api.client", () => ({ AuthClient: { markWelcomed } }));
vi.mock("@/features/business/hooks/useBusiness", () => ({ useBusiness: () => business }));

const text = UI_TEXT.welcome;
const NEW_OWNER: AuthProfile = { ...TEST_PROFILE, welcomedAt: null };

// jsdom has no pointer events; a mouse event carries what a swipe reads.
class TestPointerEvent extends MouseEvent {
  pointerId: number;
  constructor(type: string, init: PointerEventInit = {}) {
    super(type, init);
    this.pointerId = init.pointerId ?? 1;
  }
}
window.PointerEvent ??= TestPointerEvent as unknown as typeof PointerEvent;

function show(overrides: Record<string, unknown> = {}) {
  const auth = authStub({ profile: NEW_OWNER, ...overrides });
  useAuth.mockReturnValue(auth);
  const view = render(<Welcome />);
  return { ...view, auth };
}

const welcome = () => screen.getByRole("dialog", { name: text.label });
const title = () => within(welcome()).getByRole("heading");
const next = () => within(welcome()).getByRole("button", { name: text.next });
const body = () => welcome().querySelector<HTMLElement>(".welcome-body")!;
const live = () => welcome().querySelector("[aria-live]")!;

beforeEach(() => {
  markWelcomed.mockResolvedValue({ ...NEW_OWNER, welcomedAt: "2026-09-30T04:00:00.000Z" });
  business.data = { name: "Asha’s Home Bakes" };
});

afterEach(() => {
  vi.useRealTimers();
  document.documentElement.removeAttribute("data-launch");
});

describe("Welcome", () => {
  it("is for a new owner only: not an owner already welcomed, one owing a password, a developer, or nobody", () => {
    for (const overrides of [
      { profile: null },
      { profile: TEST_PROFILE },
      { requiresPasswordChange: true },
      { profile: { ...NEW_OWNER, role: "DEV" } },
    ]) {
      const { unmount } = show(overrides);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      unmount();
    }
  });

  it("greets the owner by their first name, for their business, and starts there", () => {
    show({ profile: { ...NEW_OWNER, name: "  Asha   Verma " } });
    expect(welcome()).toHaveAttribute("open");
    expect(title()).toHaveTextContent(text.hello.title("Asha"));
    expect(title()).toHaveFocus();
    expect(within(welcome()).getByText(text.hello.body("Asha’s Home Bakes"))).toBeInTheDocument();
    expect(within(welcome()).getByRole("img", { name: UI_TEXT.appName })).toBeInTheDocument();
    // Nothing is read out until a slide turns: the title already has focus.
    expect(live()).toBeEmptyDOMElement();
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("says it plainly with no name or business to hand", () => {
    business.data = undefined;
    show({ profile: { ...NEW_OWNER, name: "" } });
    expect(title()).toHaveTextContent(text.hello.title(""));
    expect(within(welcome()).getByText(text.hello.body(text.yourBusiness))).toBeInTheDocument();
  });

  it("turns with Next and Back, reads each slide out, and ends on Get started", () => {
    show();
    const back = within(welcome()).getByRole("button", { name: text.back, hidden: true });
    expect(back.closest("[inert]")).not.toBeNull();

    fireEvent.click(next());
    expect(title()).toHaveTextContent(text.orders.title);
    expect(live()).toHaveTextContent(`${text.orders.title}. ${text.orders.body} ${text.slideOf(2, 4)}`);
    expect(back.closest("[inert]")).toBeNull();

    fireEvent.click(within(welcome()).getByRole("button", { name: text.back }));
    expect(title()).toHaveTextContent(text.hello.title("Asha"));

    fireEvent.click(next());
    fireEvent.click(next());
    fireEvent.click(next());
    expect(title()).toHaveTextContent(text.numbers.title);
    expect(within(welcome()).queryByRole("button", { name: text.next })).not.toBeInTheDocument();
    expect(within(welcome()).getByRole("button", { name: text.start })).toBeInTheDocument();
  });

  it("keeps the slides not shown out of reach, and marks where it stands", () => {
    show();
    const sections = welcome().querySelectorAll("section");
    expect(sections).toHaveLength(4);
    expect([...sections].map((section) => section.dataset.state)).toEqual(["current", "after", "after", "after"]);
    expect(sections[1]).toHaveAttribute("aria-hidden", "true");
    expect(sections[1]).toHaveAttribute("inert");
    fireEvent.click(next());
    expect([...sections].map((section) => section.dataset.state)).toEqual(["before", "current", "after", "after"]);
    const dots = welcome().querySelectorAll(".welcome-dot");
    expect([...dots].map((dot) => dot.hasAttribute("data-current"))).toEqual([false, true, false, false]);
  });

  it("turns with the arrow keys, but not past either end, and leaves a key with a modifier alone", () => {
    show();
    fireEvent.keyDown(welcome(), { key: "ArrowLeft" });
    expect(title()).toHaveTextContent(text.hello.title("Asha"));
    fireEvent.keyDown(welcome(), { key: "ArrowRight", altKey: true });
    fireEvent.keyDown(welcome(), { key: "ArrowRight", ctrlKey: true });
    fireEvent.keyDown(welcome(), { key: "ArrowRight", metaKey: true });
    fireEvent.keyDown(welcome(), { key: "Enter" });
    expect(title()).toHaveTextContent(text.hello.title("Asha"));
    for (let press = 0; press < 5; press++) fireEvent.keyDown(welcome(), { key: "ArrowRight" });
    expect(title()).toHaveTextContent(text.numbers.title);
    fireEvent.keyDown(welcome(), { key: "ArrowLeft" });
    expect(title()).toHaveTextContent(text.bills.title);
  });

  it("keeps focus on the slide's title as the keys turn it, and hears keys wherever focus is", () => {
    show();
    for (const expected of [text.orders.title, text.bills.title]) {
      fireEvent.keyDown(document.activeElement!, { key: "ArrowRight" });
      expect(title()).toHaveTextContent(expected);
      expect(title()).toHaveFocus();
    }
    (document.activeElement as HTMLElement).blur();
    fireEvent.keyDown(document.body, { key: "ArrowRight" });
    expect(title()).toHaveTextContent(text.numbers.title);
    expect(document.body).toHaveFocus();
  });

  it("leaves focus on Next as it turns, and moves it off Back as the first slide comes", () => {
    show();
    next().focus();
    fireEvent.click(next());
    expect(next()).toHaveFocus();
    const back = within(welcome()).getByRole("button", { name: text.back });
    back.focus();
    fireEvent.click(back);
    expect(title()).toHaveTextContent(text.hello.title("Asha"));
    expect(title()).toHaveFocus();
  });

  it("ends on Skip: recorded at once, lifted away, then the account is known to be welcomed", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-30T04:00:00.000Z"));
    const { auth } = show();
    fireEvent.click(within(welcome()).getByRole("button", { name: text.skip }));
    fireEvent.click(within(welcome()).getByRole("button", { name: text.skip }));
    expect(markWelcomed).toHaveBeenCalledOnce();
    expect(welcome()).toHaveAttribute("data-leaving");
    expect(auth.adopt).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(WELCOME_LEAVE_MS));
    expect(auth.adopt).toHaveBeenCalledWith({
      profile: { ...NEW_OWNER, welcomedAt: "2026-09-30T04:00:00.000Z" },
      requiresPasswordChange: false,
    });
  });

  it("ends on Get started, and on Escape", () => {
    vi.useFakeTimers();
    const first = show();
    for (let press = 0; press < 3; press++) fireEvent.click(next());
    fireEvent.click(within(welcome()).getByRole("button", { name: text.start }));
    act(() => vi.advanceTimersByTime(WELCOME_LEAVE_MS));
    expect(first.auth.adopt).toHaveBeenCalledOnce();
    first.unmount();

    const second = show();
    const cancel = new Event("cancel", { cancelable: true });
    act(() => {
      welcome().dispatchEvent(cancel);
    });
    expect(cancel.defaultPrevented).toBe(true);
    act(() => vi.advanceTimersByTime(WELCOME_LEAVE_MS));
    expect(second.auth.adopt).toHaveBeenCalledOnce();
  });

  it("lifts away even when the record fails, which only brings it back on the next visit", async () => {
    vi.useFakeTimers();
    markWelcomed.mockRejectedValue(new Error("offline"));
    const { auth } = show();
    fireEvent.click(within(welcome()).getByRole("button", { name: text.skip }));
    await act(async () => vi.advanceTimersByTimeAsync(WELCOME_LEAVE_MS));
    expect(auth.adopt).toHaveBeenCalledOnce();
  });

  it("waits for a launch splash to go before standing over everything", async () => {
    document.documentElement.setAttribute("data-launch", "on");
    const showModal = vi.spyOn(HTMLDialogElement.prototype, "showModal");
    show();
    expect(showModal).not.toHaveBeenCalled();
    await act(async () => {
      document.documentElement.removeAttribute("data-launch");
      await Promise.resolve();
    });
    expect(showModal).toHaveBeenCalledOnce();
    expect(title()).toHaveFocus();
    showModal.mockRestore();
  });

  it("gives the page back as it goes", () => {
    document.body.style.overflow = "auto";
    const { unmount } = show();
    const dialog = welcome();
    unmount();
    expect(document.body.style.overflow).toBe("auto");
    expect(dialog).not.toHaveAttribute("open");
    document.body.style.overflow = "";
  });

  describe("a swipe", () => {
    const swipe = (from: number, to: number, { y = 0, id = 1 } = {}) => {
      fireEvent.pointerDown(body(), { pointerId: id, button: 0, clientX: from, clientY: 100 });
      fireEvent.pointerMove(body(), { pointerId: id, clientX: to, clientY: 100 + y });
      fireEvent.pointerUp(body(), { pointerId: id, clientX: to, clientY: 100 + y });
    };

    it("carries the slide with the finger, and turns it once carried far enough", () => {
      show();
      fireEvent.pointerDown(body(), { pointerId: 1, button: 0, clientX: 300, clientY: 100 });
      fireEvent.pointerMove(body(), { pointerId: 1, clientX: 260, clientY: 102 });
      expect(body()).toHaveAttribute("data-dragging");
      expect(body().style.getPropertyValue("--welcome-drag")).toBe("-40px");
      fireEvent.pointerMove(body(), { pointerId: 1, clientX: 250, clientY: 130 });
      expect(body().style.getPropertyValue("--welcome-drag")).toBe("-50px");
      fireEvent.pointerUp(body(), { pointerId: 1, clientX: 300 - WELCOME_SWIPE_PX, clientY: 102 });
      expect(body()).not.toHaveAttribute("data-dragging");
      expect(body().style.getPropertyValue("--welcome-drag")).toBe("");
      expect(title()).toHaveTextContent(text.orders.title);

      swipe(100, 100 + WELCOME_SWIPE_PX);
      expect(title()).toHaveTextContent(text.hello.title("Asha"));
    });

    it("holds back past either end, and settles back when not carried far enough", () => {
      show();
      fireEvent.pointerDown(body(), { pointerId: 1, button: 0, clientX: 100, clientY: 100 });
      fireEvent.pointerMove(body(), { pointerId: 1, clientX: 190, clientY: 100 });
      expect(body().style.getPropertyValue("--welcome-drag")).toBe("30px");
      fireEvent.pointerUp(body(), { pointerId: 1, clientX: 190, clientY: 100 });
      expect(title()).toHaveTextContent(text.hello.title("Asha"));

      swipe(300, 300 - WELCOME_SWIPE_PX + 10);
      expect(title()).toHaveTextContent(text.hello.title("Asha"));
      for (let turn = 0; turn < 3; turn++) swipe(300, 200);
      expect(title()).toHaveTextContent(text.numbers.title);
      fireEvent.pointerDown(body(), { pointerId: 1, button: 0, clientX: 300, clientY: 100 });
      fireEvent.pointerMove(body(), { pointerId: 1, clientX: 210, clientY: 100 });
      expect(body().style.getPropertyValue("--welcome-drag")).toBe("-30px");
    });

    it("takes the pointer for itself once it is a swipe, where the browser can", () => {
      const setPointerCapture = vi.fn();
      Object.defineProperty(HTMLElement.prototype, "setPointerCapture", {
        value: setPointerCapture,
        configurable: true,
      });
      show();
      swipe(300, 200, { id: 7 });
      expect(setPointerCapture).toHaveBeenCalledWith(7);
      Reflect.deleteProperty(HTMLElement.prototype, "setPointerCapture");
    });

    it("leaves a scroll, a nudge, another pointer, another button and a press on a control alone", () => {
      show();
      // Mostly down: a scroll, not a swipe, and it stops listening.
      fireEvent.pointerDown(body(), { pointerId: 1, button: 0, clientX: 300, clientY: 100 });
      fireEvent.pointerMove(body(), { pointerId: 1, clientX: 290, clientY: 140 });
      fireEvent.pointerMove(body(), { pointerId: 1, clientX: 100, clientY: 140 });
      fireEvent.pointerUp(body(), { pointerId: 1, clientX: 100, clientY: 140 });
      // Too small to tell.
      fireEvent.pointerDown(body(), { pointerId: 1, button: 0, clientX: 300, clientY: 100 });
      fireEvent.pointerMove(body(), { pointerId: 1, clientX: 295, clientY: 101 });
      fireEvent.pointerMove(body(), { pointerId: 2, clientX: 100, clientY: 100 });
      fireEvent.pointerUp(body(), { pointerId: 1, clientX: 295, clientY: 101 });
      expect(body()).not.toHaveAttribute("data-dragging");
      // A second button, and a press that starts on a control.
      fireEvent.pointerDown(body(), { pointerId: 1, button: 2, clientX: 300, clientY: 100 });
      fireEvent.pointerMove(body(), { pointerId: 1, clientX: 100, clientY: 100 });
      fireEvent.pointerDown(next(), { pointerId: 1, button: 0, clientX: 300, clientY: 100 });
      fireEvent.pointerMove(body(), { pointerId: 1, clientX: 100, clientY: 100 });
      fireEvent.pointerUp(body(), { pointerId: 1, clientX: 100, clientY: 100 });
      expect(body()).not.toHaveAttribute("data-dragging");
      expect(title()).toHaveTextContent(text.hello.title("Asha"));
    });

    it("settles back when the browser takes the pointer away", () => {
      show();
      fireEvent.pointerDown(body(), { pointerId: 1, button: 0, clientX: 300, clientY: 100 });
      fireEvent.pointerMove(body(), { pointerId: 1, clientX: 100, clientY: 100 });
      fireEvent.pointerCancel(body(), { pointerId: 1, clientX: 100, clientY: 100 });
      expect(body()).not.toHaveAttribute("data-dragging");
      expect(title()).toHaveTextContent(text.hello.title("Asha"));
    });

    it("is not taken while it lifts away", () => {
      show();
      fireEvent.click(within(welcome()).getByRole("button", { name: text.skip }));
      fireEvent.pointerDown(body(), { pointerId: 1, button: 0, clientX: 300, clientY: 100 });
      fireEvent.pointerMove(body(), { pointerId: 1, clientX: 100, clientY: 100 });
      expect(body()).not.toHaveAttribute("data-dragging");
    });
  });
});
