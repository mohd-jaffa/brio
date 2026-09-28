"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import { UI_TEXT } from "@/constants/messages";
import { addDaysKey, addMonthsKey, monthWeeks, todayKey, weekStartKey } from "@/lib/dates/calendar";
import { formatDate, formatLongDate, formatMonthYear } from "@/lib/format/date";

import { useAnchoredPopover } from "./anchored-popover";
import { IconButton } from "./button";
import { cn } from "./cn";
import { FIELD_WELL } from "./field-styles";

const text = UI_TEXT.datePicker;

/** How the closed control looks where it sits: as a form field, or small beside a period. */
const TRIGGERS = {
  field: FIELD_WELL,
  compact: "touch-target rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium",
} as const;

/** Tall enough for six weeks, the heading and the footer; it scrolls where the screen is shorter. */
const MAX_HEIGHT = 456;

/** The day the keys move to, from the one they are on. */
function moved(from: string, key: string, shift: boolean): string | null {
  const days: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
  if (key in days) return addDaysKey(from, days[key]);
  if (key === "PageUp") return addMonthsKey(from, shift ? -12 : -1);
  if (key === "PageDown") return addMonthsKey(from, shift ? 12 : 1);
  if (key === "Home") return weekStartKey(from);
  if (key === "End") return addDaysKey(weekStartKey(from), 6);
  return null;
}

/**
 * A day, picked from the app's own calendar (the user, 2026-09-27: "its
 * native now, change it to something which will match our design") in place
 * of the browser's, which no page can style. It holds a day as a key,
 * "2026-09-27", or "" for none.
 *
 * - **The control** shows the day ("27 Sep 2026") beside a calendar mark, in
 *   the look of where it sits, as the select does.
 * - **The calendar** opens in the top layer, set against the control
 *   (`useAnchoredPopover`): paper, a hairline, soft corners and the lifted
 *   shadow; the month in the display serif between Previous and Next; weeks
 *   from Monday; the chosen day filled in caramel, and today ringed. Days
 *   before `min` or after `max` cannot be taken. **Today** takes today, and
 *   **Clear**, where the field may be empty, takes none.
 * - **Keyboard** (WAI-ARIA's date picker dialog): the calendar takes the
 *   focus on the chosen day, or today; the arrows move a day or a week,
 *   Page Up and Page Down a month (with Shift, a year), Home and End the
 *   week's ends; Enter or Space takes the day; Escape closes it, and the focus
 *   goes back to the control. Tabbing out of it closes it too.
 */
export const DatePicker = forwardRef<
  HTMLButtonElement,
  {
    /** The control's id, for a `<label htmlFor>`. */
    id?: string;
    /** What the day is for: the calendar's name, and the control's unless `labelledBy` names it. */
    label: string;
    /** The id of a visible label that names the control. */
    labelledBy?: string;
    value: string;
    onChange: (value: string) => void;
    onBlur?: () => void;
    min?: string;
    max?: string;
    /** Shown while no day is chosen. */
    placeholder?: string;
    /** Whether the field may be emptied again (Clear). */
    clearable?: boolean;
    variant?: keyof typeof TRIGGERS;
    invalid?: boolean;
    describedBy?: string;
    disabled?: boolean;
  }
>(function DatePicker(
  {
    id,
    label,
    labelledBy,
    value,
    onChange,
    onBlur,
    min,
    max,
    placeholder = text.choose,
    clearable = false,
    variant = "field",
    invalid,
    describedBy,
    disabled,
  },
  ref,
) {
  const panelId = useId();
  const titleId = `${panelId}-title`;
  const valueId = `${panelId}-value`;
  const control = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const moveFocus = useRef(false);
  useImperativeHandle(ref, () => control.current!, []);

  const [open, setOpen] = useState(false);
  // The day the keys are on; the calendar shows its month.
  const [focused, setFocused] = useState(value || todayKey());
  const today = todayKey();
  const within = (day: string) => !(min && day < min) && !(max && day > max);
  const clamp = (day: string) => (min && day < min ? min : max && day > max ? max : day);

  // A tap elsewhere closes it, and has left the field.
  useAnchoredPopover({
    open,
    panel,
    control,
    maxHeight: MAX_HEIGHT,
    onDismiss: () => {
      setOpen(false);
      onBlur?.();
    },
  });

  // The keys' day takes the focus as the calendar opens, and as they move it.
  useEffect(() => {
    if (!open || !moveFocus.current) return;
    moveFocus.current = false;
    panel.current?.querySelector<HTMLButtonElement>(`[data-day="${focused}"]`)?.focus();
  });

  const show = () => {
    setFocused(clamp(value || today));
    moveFocus.current = true;
    setOpen(true);
  };
  const close = () => {
    setOpen(false);
    control.current?.focus();
  };
  const take = (day: string) => {
    close();
    if (day !== value) onChange(day);
  };
  const goTo = (day: string) => {
    moveFocus.current = true;
    setFocused(clamp(day));
  };

  // Once the focus has settled: gone from both the control and the calendar,
  // it closes. A day re-drawn for another month hands the focus on first.
  const leave = () =>
    requestAnimationFrame(() => {
      const active = document.activeElement;
      if (active === control.current || panel.current?.contains(active)) return;
      setOpen(false);
      onBlur?.();
    });

  const onGridKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const next = moved(focused, event.key, event.shiftKey);
    if (!next) return;
    event.preventDefault();
    goTo(next);
  };

  const onPanelKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Escape") return;
    // Closes the calendar, not the sheet it sits in.
    event.preventDefault();
    event.stopPropagation();
    close();
  };

  return (
    <>
      <button
        ref={control}
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={labelledBy ? undefined : `${label} ${value ? formatDate(value) : placeholder}`}
        aria-labelledby={labelledBy ? `${labelledBy} ${valueId}` : undefined}
        // A button cannot be marked invalid or required: its field's message
        // is its description, and the look comes from the well.
        data-invalid={invalid || undefined}
        aria-describedby={describedBy}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : show())}
        onBlur={leave}
        className={cn(
          TRIGGERS[variant],
          "flex items-center gap-2 text-left text-text disabled:cursor-not-allowed disabled:opacity-60",
        )}
      >
        <CalendarDays size={16} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-text-muted" />
        <span id={valueId} className={cn("min-w-0 flex-1 truncate tabular-nums", !value && "text-text-muted")}>
          {value ? formatDate(value) : placeholder}
        </span>
      </button>
      <div
        ref={panel}
        id={panelId}
        role="dialog"
        aria-label={text.calendar(label)}
        popover="manual"
        // A tap inside moves nothing: the focus stays on the day the keys are on.
        onMouseDown={(event) => event.preventDefault()}
        onKeyDown={onPanelKeyDown}
        onBlur={leave}
        className="animate-drop-in inset-auto m-0 w-[20.875rem] max-w-[calc(100vw-1rem)] overflow-y-auto overscroll-contain rounded-2xl border border-border bg-surface p-3 text-text shadow-elevated"
      >
        {/* Drawn only while open: a closed calendar is nothing to carry. */}
        {open && (
          <>
        <div className="flex items-center justify-between gap-2 pb-2">
          <IconButton
            icon={ChevronLeft}
            label={text.previousMonth}
            disabled={Boolean(min) && focused.slice(0, 7) <= min!.slice(0, 7)}
            onClick={() => goTo(addMonthsKey(focused, -1))}
          />
          <p id={titleId} aria-live="polite" className="font-heading text-lg font-medium text-text">
            {formatMonthYear(focused)}
          </p>
          <IconButton
            icon={ChevronRight}
            label={text.nextMonth}
            disabled={Boolean(max) && focused.slice(0, 7) >= max!.slice(0, 7)}
            onClick={() => goTo(addMonthsKey(focused, 1))}
          />
        </div>

        <div role="grid" aria-labelledby={titleId} onKeyDown={onGridKeyDown} className="space-y-1">
          <div role="row" className="grid grid-cols-7">
            {text.weekdaysShort.map((day, index) => (
              <span
                key={day}
                role="columnheader"
                aria-label={text.weekdays[index]}
                className="py-1 text-center text-xs font-medium text-text-muted"
              >
                {day}
              </span>
            ))}
          </div>
          {monthWeeks(focused).map((week) => (
            <div key={week.find(Boolean)} role="row" className="grid grid-cols-7">
              {week.map((day, index) =>
                day ? (
                  <div key={day} role="gridcell" aria-selected={day === value} className="flex justify-center">
                    <button
                      type="button"
                      data-day={day}
                      tabIndex={day === focused ? 0 : -1}
                      disabled={!within(day)}
                      aria-label={formatLongDate(day)}
                      aria-current={day === today ? "date" : undefined}
                      onClick={() => take(day)}
                      className={cn(
                        "flex size-11 items-center justify-center rounded-full text-sm tabular-nums transition-colors",
                        "disabled:cursor-not-allowed disabled:opacity-35",
                        day === value
                          ? "bg-primary font-semibold text-primary-text hover:bg-primary-hover"
                          : "text-text enabled:hover:bg-sunken",
                        day === today && day !== value && "font-semibold text-primary ring-1 ring-inset ring-primary/50",
                      )}
                    >
                      {Number(day.slice(8))}
                    </button>
                  </div>
                ) : (
                  <div key={`blank-${index}`} role="gridcell" aria-hidden="true" />
                ),
              )}
            </div>
          ))}
        </div>

        <div className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-2">
          <button
            type="button"
            disabled={!within(today)}
            onClick={() => take(today)}
            className="touch-target rounded-lg px-3 text-sm font-semibold text-primary transition-colors hover:bg-sunken disabled:opacity-40"
          >
            {text.today}
          </button>
          {clearable && (
            <button
              type="button"
              disabled={!value}
              onClick={() => take("")}
              className="touch-target rounded-lg px-3 text-sm font-medium text-text-muted transition-colors hover:bg-sunken hover:text-text disabled:opacity-40"
            >
              {text.clear}
            </button>
          )}
        </div>
          </>
        )}
      </div>
    </>
  );
});
