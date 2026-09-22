import { cn } from "./cn";

/**
 * A line the screen has to say on its own behalf — most often that something
 * could not be loaded or saved. Announced, because it usually appears in
 * answer to something the baker just did.
 */
export function ScreenNotice({
  children,
  tone = "danger",
}: {
  children: string;
  tone?: "danger" | "info";
}) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-xl border p-4 text-sm font-medium",
        tone === "danger"
          ? "border-danger/20 bg-danger-bg text-danger"
          : "border-border bg-surface text-text-muted",
      )}
    >
      {children}
    </div>
  );
}
