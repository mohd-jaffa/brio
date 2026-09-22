import { paiseToRupees, roundToPaise } from "@/lib/money";

export const CURRENCY_SYMBOL = "₹";

/** A rupee amount as a baker reads it: "₹1,500", "₹1,500.50", or "—" for nothing. */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return "—";
  const value = roundToPaise(amount);
  const hasFraction = Math.round(value * 100) % 100 !== 0;
  return `${CURRENCY_SYMBOL}${value.toLocaleString("en-IN", {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * What every screen shows, because every amount the app stores is in paise
 * (AGENTS.md §13). No screen divides by 100 itself.
 */
export function formatPaise(paise: number | null | undefined): string {
  if (paise === null || paise === undefined || !Number.isFinite(paise)) return "—";
  return formatCurrency(paiseToRupees(paise));
}
