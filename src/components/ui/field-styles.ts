/**
 * The well every field sits in (DESIGN.md, Inputs): Flour Well fill, a
 * hairline, 12 px corners, and the caramel border and ring on focus — brick
 * when the field has something to put right. Shared by the text fields and
 * the select, so a choice looks like the fields around it. A control whose role
 * cannot say it is invalid — the date picker's button — says so with
 * `data-invalid`, and its message is in its description.
 */
export const FIELD_WELL =
  "w-full rounded-xl border border-border bg-sunken px-4 py-3 text-sm font-medium outline-none transition " +
  "focus:border-primary focus:ring-1 focus:ring-primary " +
  "aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger " +
  "data-[invalid=true]:border-danger data-[invalid=true]:focus:ring-danger";
