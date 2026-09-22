/**
 * Only the named columns of a patch. Keys the patch does not have stay absent,
 * so a partial update never writes a column it was not given. Used with
 * EDITABLE_COLUMNS (src/constants/editableColumns.ts), which is the only list
 * of columns the app may UPDATE directly.
 */
export function pickColumns<T extends object, K extends keyof T>(
  patch: T,
  columns: readonly K[],
): Partial<Pick<T, K>> {
  const picked: Partial<Pick<T, K>> = {};
  for (const column of columns) {
    if (Object.prototype.hasOwnProperty.call(patch, column)) picked[column] = patch[column];
  }
  return picked;
}

/**
 * The entries a patch actually carries. A field the caller left out is
 * `undefined` here and is dropped, so "not given" and "given as empty" stay
 * different things all the way to the database.
 */
export function definedOnly<T extends object>(values: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

/**
 * A field a form leaves blank, stored as NULL. A field the patch does not
 * carry stays `undefined` and is dropped by definedOnly, so clearing a value
 * and not touching it remain distinguishable.
 */
export function blankToNull<T>(value: T | "" | null | undefined): T | null | undefined {
  if (value === undefined) return undefined;
  return value === "" || value === null ? null : value;
}
