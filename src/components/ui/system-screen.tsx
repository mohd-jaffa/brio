import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * A whole-screen stop: a page that is not there, or a screen that failed. It
 * stands on its own, outside the app shell, because the shell may be what
 * failed, and always offers a way on (plan §134 P0-2, P1-1).
 */
export function SystemScreen({
  icon: Icon,
  title,
  body,
  reference,
  children,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  /** A code to quote when asking for help — never the error's own text. */
  reference?: string;
  /** The actions: the way back, and a retry where one makes sense. */
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 py-12 text-center">
      <div className="flex w-full max-w-sm flex-col items-center">
        <span className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon size={28} strokeWidth={2} aria-hidden="true" />
        </span>
        <h1 className="font-display text-3xl leading-tight text-text text-balance">{title}</h1>
        <p className="mt-3 text-base text-text-muted text-pretty">{body}</p>
        {reference && <p className="mt-3 text-xs tabular-nums text-text-muted">{reference}</p>}
        <div className="mt-8 flex w-full flex-col gap-3">{children}</div>
      </div>
    </main>
  );
}
