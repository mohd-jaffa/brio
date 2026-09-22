/**
 * Only the named columns of a patch. Keys the patch does not have stay
 * absent, so a partial update never writes a column it was not given.
 * Used with EDITABLE_COLUMNS (src/constants/editableColumns.ts).
 */
export function pickColumns<T extends object, K extends keyof T>(patch: T, columns: readonly K[]): Partial<Pick<T, K>> {
  const picked: Partial<Pick<T, K>> = {};
  for (const column of columns) {
    if (Object.prototype.hasOwnProperty.call(patch, column)) picked[column] = patch[column];
  }
  return picked;
}
