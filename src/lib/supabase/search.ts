/**
 * A list's search, made safe to hand to PostgREST (plan §133.9 I4, IMP-01).
 * The characters a LIKE pattern reads as wildcards, and the ones that end or
 * nest a PostgREST filter, are dropped rather than escaped: nobody searches a
 * customer or an order for them, and a pattern without them cannot be read as
 * anything but the words typed.
 */
const UNSAFE = /[%_\\"(),*:]/g;

/** "Priya" → `%Priya%`, to match anywhere in a column; null when nothing is left to look for. */
export function containsPattern(search: string): string | null {
  const term = search.replace(UNSAFE, " ").replace(/\s+/g, " ").trim();
  return term === "" ? null : `%${term}%`;
}

/**
 * `column.ilike."%term%"` for a PostgREST `or` filter: the value is quoted, so
 * a space in it cannot split the filter.
 */
export function ilikeFilter(column: string, pattern: string): string {
  return `${column}.ilike."${pattern}"`;
}

/**
 * The digits in a search, for matching a phone number however it was typed —
 * "98765 43210" and "+91-98765-43210" alike (BUG-23). Phones are stored as
 * `+91` and ten digits, so a search of eleven or more digits that starts with
 * the country code is matched on the ten that follow it. Fewer than three
 * digits say too little to match a phone on.
 */
export function phoneDigits(search: string): string | null {
  const digits = search.replace(/\D/g, "");
  const national = digits.length > 10 && digits.startsWith("91") ? digits.slice(digits.length - 10) : digits;
  return national.length >= 3 ? national : null;
}
