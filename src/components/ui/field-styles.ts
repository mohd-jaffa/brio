/**
 * The well every field sits in (DESIGN.md, Inputs): Flour Well fill, an edge
 * that clears 3 : 1 on every ground it sits on (`field-edge`, WCAG 1.4.11 — a
 * hairline alone could not show where to type), 12 px corners, and the
 * caramel border and ring on focus — brick
 * when the field has something to put right. Shared by the text fields and
 * the select, so a choice looks like the fields around it. A control whose role
 * cannot say it is invalid — the date picker's button — says so with
 * `data-invalid`, and its message is in its description.
 *
 * What is typed is 16 px: below that, an iPhone zooms the page in as a field
 * is tapped, and the page stays zoomed after the keyboard has gone (the user,
 * 2026-10-01). The well keeps its height, 46 px, with less padding.
 */
export const FIELD_WELL =
  "w-full rounded-xl border border-field-edge bg-sunken px-4 py-2.5 text-base font-medium outline-none transition " +
  "focus:border-primary focus:ring-1 focus:ring-primary " +
  "aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger " +
  "data-[invalid=true]:border-danger data-[invalid=true]:focus:ring-danger";
