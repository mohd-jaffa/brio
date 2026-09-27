import type { ReactNode } from "react";

/** A bar that stays at the foot of an order step, above the bottom navigation (plan §139.10). */
export function StepBar({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-[calc(var(--nav-height)+var(--safe-bottom)+0.75rem)] z-20 md:bottom-6 lg:hidden">
      {children}
    </div>
  );
}
