import { UI_TEXT } from "@/constants/messages";

/**
 * "Good morning, Priya" (plan §139.10, §134 P2-1): the part of the day on the
 * business's clock, and the person's first name — the person, not the role.
 */
export function greeting(hour: number, fullName: string | undefined): string {
  const parts = UI_TEXT.home.partsOfDay;
  const partOfDay = hour >= 5 && hour < 12 ? parts.morning : hour >= 12 && hour < 17 ? parts.afternoon : parts.evening;
  const [first = ""] = (fullName ?? "").trim().split(/\s+/);
  return UI_TEXT.home.greeting(partOfDay, first);
}
