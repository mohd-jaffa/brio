import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { UI_TEXT } from "@/constants/messages";
import { formatLongDate, formatMonthYear } from "@/lib/format/date";

/** The month key ("2026-09") a calendar's heading names ("September 2026"). */
function monthShown(calendar: HTMLElement): string {
  const grid = within(calendar).getByRole("grid");
  const heading = document.getElementById(grid.getAttribute("aria-labelledby") ?? "")?.textContent ?? "";
  const year = heading.slice(-4);
  for (let month = 1; month <= 12; month += 1) {
    const key = `${year}-${String(month).padStart(2, "0")}`;
    if (formatMonthYear(key) === heading) return key;
  }
  throw new Error(`Not a month: ${heading}`);
}

/**
 * Picks a day from the app's calendar as a person would: opens the field
 * named `label`, pages to the day's month, and taps the day.
 */
export async function pickDate(label: string, day: string) {
  await userEvent.click(screen.getByRole("button", { name: new RegExp(`^${label}\\b`) }));
  const calendar = await screen.findByRole("dialog", { name: UI_TEXT.datePicker.calendar(label) });
  for (let turns = 0; monthShown(calendar) !== day.slice(0, 7); turns += 1) {
    if (turns > 240) throw new Error(`Could not reach ${day}`);
    const later = day.slice(0, 7) > monthShown(calendar);
    await userEvent.click(
      within(calendar).getByRole("button", {
        name: later ? UI_TEXT.datePicker.nextMonth : UI_TEXT.datePicker.previousMonth,
      }),
    );
  }
  await userEvent.click(within(calendar).getByRole("button", { name: formatLongDate(day) }));
}
