import { UI_TEXT } from "@/constants/messages";

/**
 * A stored value as a developer reads it: indented JSON in the mono face,
 * scrolling sideways rather than breaking the page. Nothing, when there is
 * nothing.
 */
export function JsonBlock({ label, value }: { label: string; value: unknown }) {
  return (
    <figure aria-label={label} className="min-w-0 space-y-1">
      <figcaption className="text-xs font-semibold uppercase tracking-wider text-text-muted">{label}</figcaption>
      <pre className="max-h-72 overflow-auto rounded-lg border border-border bg-sunken p-3 font-mono text-xs leading-relaxed text-text">
        {value == null ? UI_TEXT.admin.nothing : JSON.stringify(value, null, 2)}
      </pre>
    </figure>
  );
}
