"use client";

import { Minus, Plus } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import { MAX_QUANTITY } from "@/constants/limits";
import { UI_TEXT } from "@/constants/messages";

// Hold a button this long and it starts repeating, this often.
const REPEAT_AFTER = 400;
const REPEAT_EVERY = 80;
const PAGE = 10;

/**
 * − / value / + (plan §139.5). The value is a spinbutton: it can be typed,
 * the arrow keys step it, Page Up and Down step by ten, Home and End go to
 * the bounds. The buttons are for a finger or a pointer, 44 px to the touch
 * though drawn smaller, and repeat while held; being out of the Tab order,
 * they leave the keyboard one stop, as the WAI-ARIA spinbutton does.
 */
export function QuantityStepper({
  value,
  onChange,
  label,
  min = 1,
  max = MAX_QUANTITY,
}: {
  value: number;
  onChange: (next: number) => void;
  /** What is being counted, for a screen reader: "Quantity of Chocolate truffle cake". */
  label: string;
  min?: number;
  max?: number;
}) {
  const clamp = (next: number) => Math.min(max, Math.max(min, next));
  // What is typed, while it is being typed; the value otherwise.
  const [draft, setDraft] = useState<string | null>(null);
  const held = useRef<{ timer?: ReturnType<typeof setTimeout>; value: number; pressed: boolean }>({
    value,
    pressed: false,
  });

  const stop = () => {
    clearTimeout(held.current.timer);
    held.current.timer = undefined;
  };
  useEffect(() => stop, []);
  // A press that slides off the button ends with no click to follow it.
  const release = () => {
    stop();
    held.current.pressed = false;
  };

  const start = (step: number) => {
    held.current = { value, pressed: true };
    const tick = (delay: number) => {
      const next = clamp(held.current.value + step);
      if (next === held.current.value) return stop();
      held.current.value = next;
      onChange(next);
      held.current.timer = setTimeout(() => tick(REPEAT_EVERY), delay);
    };
    tick(REPEAT_AFTER);
  };

  // A tap already stepped on pointer down; a click with no press behind it —
  // a screen reader's — steps here.
  const click = (step: number) => {
    if (held.current.pressed) {
      held.current.pressed = false;
      return;
    }
    onChange(clamp(value + step));
  };

  const commit = () => {
    if (draft === null) return;
    const typed = Number.parseInt(draft, 10);
    setDraft(null);
    if (Number.isFinite(typed)) onChange(clamp(typed));
  };

  const keys = (event: KeyboardEvent<HTMLInputElement>) => {
    const steps: Record<string, number> = {
      ArrowUp: value + 1,
      ArrowDown: value - 1,
      PageUp: value + PAGE,
      PageDown: value - PAGE,
      Home: min,
      End: max,
    };
    if (event.key === "Enter") return commit();
    if (!(event.key in steps)) return;
    event.preventDefault();
    setDraft(null);
    onChange(clamp(steps[event.key]));
  };

  const button = (step: number) => {
    const blocked = step < 0 ? value <= min : value >= max;
    const Icon = step < 0 ? Minus : Plus;
    return (
      <button
        type="button"
        tabIndex={-1}
        aria-label={step < 0 ? UI_TEXT.quantity.decrease : UI_TEXT.quantity.increase}
        disabled={blocked}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.preventDefault();
          start(step);
        }}
        onPointerUp={stop}
        onPointerLeave={release}
        onPointerCancel={release}
        onClick={() => click(step)}
        className="hit-area inline-flex size-8 items-center justify-center rounded-lg text-text transition-colors hover:bg-surface-hover disabled:text-text-muted disabled:opacity-50"
      >
        <Icon size={16} strokeWidth={2} aria-hidden="true" />
      </button>
    );
  };

  return (
    <div className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface p-1">
      {button(-1)}
      <input
        type="text"
        inputMode="numeric"
        role="spinbutton"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        value={draft ?? String(value)}
        onChange={(event) => setDraft(event.target.value.replace(/\D/g, ""))}
        onKeyDown={keys}
        onBlur={commit}
        className="w-10 bg-transparent text-center text-sm font-semibold tabular-nums text-text"
      />
      {button(1)}
    </div>
  );
}
