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

// Largest first: an amount takes the first unit it reaches one of.
const COMPACT_UNITS = [
  { size: 10_000_000, suffix: "Cr" },
  { size: 100_000, suffix: "L" },
  { size: 1_000, suffix: "K" },
] as const;

/**
 * An amount short enough for a chart's axis: "₹2K", "₹1.5L", "₹1Cr", in the
 * Indian units people read (plan §139.11.11). One decimal at most. Rounding
 * is done before a unit is chosen, so ₹99,999 reads "₹1L", not "₹100K".
 * Only the axes use it: a value someone reads in full is `formatPaise`.
 */
export function formatPaiseCompact(paise: number | null | undefined): string {
  if (paise === null || paise === undefined || !Number.isFinite(paise)) return "—";
  const rupees = paiseToRupees(paise);
  const sign = rupees < 0 ? "-" : "";
  const size = Math.abs(rupees);
  for (const unit of COMPACT_UNITS) {
    const scaled = Math.round((size / unit.size) * 10) / 10;
    if (scaled >= 1) {
      return `${sign}${CURRENCY_SYMBOL}${scaled.toLocaleString("en-IN", { maximumFractionDigits: 1 })}${unit.suffix}`;
    }
  }
  return `${sign}${CURRENCY_SYMBOL}${Math.round(size)}`;
}
