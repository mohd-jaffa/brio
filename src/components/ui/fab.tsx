import { Plus } from "lucide-react";
import Link from "next/link";

const ROUND =
  "fixed right-[calc(var(--safe-right)+1rem)] bottom-[calc(var(--nav-height)+var(--safe-bottom)+1rem)] z-30 inline-flex size-14 items-center justify-center rounded-full bg-action text-action-text shadow-elevated transition-colors hover:bg-action-hover active:scale-95 md:hidden";
const WIDE =
  "touch-target hidden items-center gap-2 rounded-xl bg-action px-4 py-2.5 text-sm font-semibold text-action-text shadow-elevated transition-colors hover:bg-action-hover md:inline-flex";

/**
 * The screen's one way to add something (plan §139.5). On a phone it is the
 * dark circular + above the bottom nav, clear of the home indicator; from
 * 768 px, where the header has room, it is a button with its words instead.
 * Put it in the page header's action slot: the round one floats wherever it
 * is written. It goes to `href`, or opens something with `onClick`.
 */
export function Fab({ label, ...target }: { label: string } & ({ href: string } | { onClick: () => void })) {
  const round = <Plus size={24} strokeWidth={2} aria-hidden="true" />;
  const wide = (
    <>
      <Plus size={18} strokeWidth={2} aria-hidden="true" />
      {label}
    </>
  );
  if ("href" in target) {
    return (
      <>
        <Link href={target.href} aria-label={label} className={ROUND}>
          {round}
        </Link>
        <Link href={target.href} className={WIDE}>
          {wide}
        </Link>
      </>
    );
  }
  return (
    <>
      <button type="button" aria-label={label} onClick={target.onClick} className={ROUND}>
        {round}
      </button>
      <button type="button" onClick={target.onClick} className={WIDE}>
        {wide}
      </button>
    </>
  );
}
