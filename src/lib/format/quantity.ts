/**
 * A count with its unit, the way it is said: "1 box", "6 boxes", "14 kg".
 * Measures (kg, dozen) do not take a plural; countable units do.
 */
const PLURALS: Record<string, string> = {
  piece: "pieces",
  box: "boxes",
  gram: "grams",
  set: "sets",
  bunch: "bunches",
  pack: "packs",
};

export function formatQuantity(count: number, unit: string): string {
  const shown = Math.abs(count) === 1 ? unit : pluralUnit(unit);
  return `${count.toLocaleString("en-IN")} ${shown}`;
}

/** A unit as it is said of several: "boxes", "kg" (a measure keeps its form). */
export function pluralUnit(unit: string): string {
  return PLURALS[unit] ?? unit;
}
