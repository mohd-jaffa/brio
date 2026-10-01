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
 * though drawn smaller: a tap steps once, and a hold repeats; being out of the Tab order,
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
  // A hold in progress: where it has counted to, and which button, once it
  // has repeated, has a click still to come that it already answered.
  const held = useRef<{ timer?: ReturnType<typeof setTimeout>; value: number; repeated: number }>({
    value,
    repeated: 0,
  });

  const stop = () => {
    clearTimeout(held.current.timer);
    held.current.timer = undefined;
  };
  useEffect(() => stop, []);

  // Held down, it starts stepping after a moment and keeps on until let go.
  // A quick tap never gets that far: its click steps it, below.
  const start = (step: number) => {
    stop();
    held.current = { value, repeated: 0 };
    const tick = () => {
      const next = clamp(held.current.value + step);
      if (next === held.current.value) return stop();
      held.current = { ...held.current, value: next, repeated: step };
      onChange(next);
      held.current.timer = setTimeout(tick, REPEAT_EVERY);
    };
    held.current.timer = setTimeout(tick, REPEAT_AFTER);
  };

  // Every tap steps here, once — a mouse's, a finger's or a screen reader's.
  // It used to step on pointer down and skip this click, but a touch ends
  // with pointerleave *before* its click, which cleared the skip, so every
  // tap on a phone counted twice (1 → 3 → 5). Only the click that ends a
  // hold is skipped: the hold has already stepped.
  const click = (step: number) => {
    const answered = held.current.repeated === step;
    held.current.repeated = 0;
    if (!answered) onChange(clamp(value + step));
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
        onPointerLeave={stop}
        onPointerCancel={stop}
        onClick={() => click(step)}
        className="hit-area inline-flex size-8 items-center justify-center rounded-lg text-text transition-colors hover:bg-surface-hover disabled:text-text-muted disabled:opacity-50"
      >
        <Icon size={16} strokeWidth={2} aria-hidden="true" />
      </button>
    );
  };

  return (
    <div className="inline-flex items-center gap-1.5 rounded-xl border border-field-edge bg-surface p-1">
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
        // 44 px to the touch, as the buttons are: it takes the stepper's full
        // height, over its padding, and its ring is drawn inside. 16 px, as
        // every field is, or an iPhone zooms in on it (field-styles.ts).
        className="focus-inset -my-1.5 w-11 self-stretch rounded-lg bg-transparent text-center text-base font-semibold tabular-nums text-text"
      />
      {button(1)}
    </div>
  );
}
