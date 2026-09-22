/**
 * A field's validation message. Announced when it appears, and tied to its
 * control by id so a screen reader reads it with the field rather than
 * stranded after it (AGENTS.md §21).
 */
export function FieldError({ id, message }: { id?: string; message?: string | null }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-xs font-medium text-danger">
      {message}
    </p>
  );
}
