import { PROFILE_CHANGE_DAYS } from "@/constants/limits";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * When a profile detail changed at `changedAt` may change again (plan §139.10;
 * the user, 2026-09-26), or null when it may change now — it never has, or
 * the 30 days are over. The database holds the same rule (0021); this is so a
 * screen can say it first.
 */
export function changeReopensAt(changedAt: string | null, now: Date = new Date()): string | null {
  if (!changedAt) return null;
  const reopens = new Date(new Date(changedAt).getTime() + PROFILE_CHANGE_DAYS * DAY_MS);
  return reopens > now ? reopens.toISOString() : null;
}
