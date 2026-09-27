"use client";

import { Check, ChevronDown } from "lucide-react";
import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { useAnchoredPopover } from "./anchored-popover";
import { cn } from "./cn";
import { FIELD_WELL } from "./field-styles";

export interface SelectOption {
  value: string;
  label: string;
}

/**
 * How the closed choice looks where it sits: as a form field, as the
 * references' period pill beside a screen's title, or small beside a chart.
 */
const TRIGGERS = {
  field: FIELD_WELL,
  pill: "touch-target rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium shadow-card",
  compact: "touch-target rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium",
} as const;

/** The list is never taller than this, nor than the room beside the control. */
const MAX_HEIGHT = 288;

/**
 * A choice from a short list (plan §139.5; the user, 2026-09-27): a control
 * that shows what is chosen, and a list of the choices in the app's own look —
 * paper, a hairline, soft corners and a lifted shadow — where the browser's
 * own list used to open, which no page can style.
 *
 * - **Where it opens:** in the page's top layer, so no sheet that scrolls can
 *   clip it; under the control, or over it when there is more room there.
 * - **Keyboard:** a select-only combobox (WAI-ARIA). Focus stays on the
 *   control; the arrows, Home and End move through the choices, a letter
 *   jumps to one, Enter or Space takes it, and Escape or Tab closes it.
 * - **Pointer:** a tap on a choice takes it; a tap anywhere else closes it.
 *   A scroll or a resize carries it along with its control. Every choice is
 *   at least 44 px tall.
 *
 * `placeholder` stands first as a choice of its own, with the empty value —
 * "All categories" — as a native select's first option would.
 */
export const SelectMenu = forwardRef<
  HTMLButtonElement,
  {
    /** The control's id, for a `<label htmlFor>`. */
    id?: string;
    /** What the choice is of: the list's name, and the control's unless `labelledBy` names it. */
    label: string;
    /** The id of a visible label that names the control. */
    labelledBy?: string;
    value: string;
    options: readonly SelectOption[];
    onChange: (value: string) => void;
    onBlur?: () => void;
    placeholder?: string;
    variant?: keyof typeof TRIGGERS;
    /** A mark before the chosen label — the period pill's calendar. */
    leading?: ReactNode;
    invalid?: boolean;
    required?: boolean;
    describedBy?: string;
    disabled?: boolean;
  }
>(function SelectMenu(
  {
    id,
    label,
    labelledBy,
    value,
    options,
    onChange,
    onBlur,
    placeholder,
    variant = "field",
    leading,
    invalid,
    required,
    describedBy,
    disabled,
  },
  ref,
) {
  const listId = useId();
  const control = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  useImperativeHandle(ref, () => control.current!, []);

  const choices: readonly SelectOption[] = placeholder ? [{ value: "", label: placeholder }, ...options] : options;
  const chosen = choices.findIndex((option) => option.value === value);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const optionId = (index: number) => `${listId}-${index}`;

  const openAt = (index: number) => {
    setActive(Math.max(0, Math.min(index, choices.length - 1)));
    setOpen(true);
  };
  const take = (index: number) => {
    const choice = choices[index];
    setOpen(false);
    if (choice && choice.value !== value) onChange(choice.value);
  };

  // In the top layer, set against the control; closed by a tap anywhere else.
  useAnchoredPopover({ open, panel: list, control, maxHeight: MAX_HEIGHT, onDismiss: () => setOpen(false) });

  // The choice the keys are on stays in view as they move.
  useEffect(() => {
    if (open) document.getElementById(optionId(active))?.scrollIntoView?.({ block: "nearest" });
  });

  /** The next choice after the one the keys are on whose label begins with `letter`. */
  const byLetter = (letter: string) => {
    const from = open ? active : chosen;
    for (let step = 1; step <= choices.length; step += 1) {
      const index = (from + step + choices.length) % choices.length;
      if (choices[index].label.toLowerCase().startsWith(letter.toLowerCase())) return index;
    }
    return -1;
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const last = choices.length - 1;
    const here = open ? active : Math.max(chosen, 0);
    const moves: Record<string, number> = {
      ArrowDown: open ? here + 1 : here,
      ArrowUp: open ? here - 1 : here,
      Home: 0,
      End: last,
    };
    if (event.key in moves) {
      event.preventDefault();
      openAt(moves[event.key]);
      return;
    }
    if (open && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      take(active);
      return;
    }
    if (open && event.key === "Escape") {
      // Closes the list, not the sheet it sits in.
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      return;
    }
    if (event.key.length === 1 && event.key !== " " && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const index = byLetter(event.key);
      if (index >= 0) openAt(index);
    }
  };

  return (
    <>
      <button
        ref={control}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? optionId(active) : undefined}
        aria-label={labelledBy ? undefined : label}
        aria-labelledby={labelledBy}
        aria-invalid={invalid || undefined}
        aria-required={required || undefined}
        aria-describedby={describedBy}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openAt(chosen))}
        onKeyDown={onKeyDown}
        // Space would click again as it is let go, and open what it just closed.
        onKeyUp={(event) => event.key === " " && event.preventDefault()}
        onBlur={() => {
          setOpen(false);
          onBlur?.();
        }}
        className={cn(
          TRIGGERS[variant],
          "flex items-center gap-2 text-left text-text disabled:cursor-not-allowed disabled:opacity-60",
        )}
      >
        {leading}
        <span className={cn("min-w-0 flex-1 truncate", chosen < 0 && "text-text-muted")}>
          {choices[chosen]?.label ?? ""}
        </span>
        <ChevronDown
          size={16}
          strokeWidth={1.75}
          aria-hidden="true"
          className={cn("shrink-0 text-text-muted transition-transform duration-200", open && "rotate-180")}
        />
      </button>
      <ul
        ref={list}
        id={listId}
        role="listbox"
        aria-label={label}
        popover="manual"
        // The control keeps the focus while a choice is tapped.
        onMouseDown={(event) => event.preventDefault()}
        className="animate-drop-in inset-auto m-0 w-max max-w-[calc(100vw-1rem)] overflow-y-auto overscroll-contain rounded-xl border border-border bg-surface p-1.5 text-text shadow-elevated"
      >
        {choices.map((option, index) => (
          <li
            key={option.value}
            id={optionId(index)}
            role="option"
            aria-selected={index === chosen}
            data-active={(open && index === active) || undefined}
            onClick={() => take(index)}
            onMouseEnter={() => setActive(index)}
            className="flex min-h-11 cursor-pointer items-center justify-between gap-6 rounded-lg px-3 py-2 text-sm text-text transition-colors data-[active]:bg-sunken aria-selected:font-semibold"
          >
            <span className="truncate">{option.label}</span>
            {index === chosen && (
              <Check size={16} strokeWidth={2} aria-hidden="true" className="shrink-0 text-primary" />
            )}
          </li>
        ))}
      </ul>
    </>
  );
});
