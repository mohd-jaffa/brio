"use client";

import { cn } from "@/components/ui/cn";
import { RollingNumber } from "@/components/ui/rolling-number";
import { StatusPill } from "@/components/ui/status-pill";
import { UI_TEXT } from "@/constants/messages";
import { useArrived } from "@/hooks/useArrived";
import { useLeaving } from "@/hooks/useLeaving";
import { formatQuantity } from "@/lib/format/quantity";

/**
 * "12 pieces in stock", its count rolling the way the stock moved — up for
 * what came in, down for what went (plan §139.5). The line comes whole from
 * the catalogue and the count is found in it, so the words stay where the
 * catalogue puts them and only the count moves.
 */
export function InStock({ balance, unit }: { balance: number; unit: string }) {
  const quantity = formatQuantity(balance, unit);
  const line = UI_TEXT.inventory.inStock(quantity);
  const at = line.indexOf(quantity);
  return (
    <>
      {line.slice(0, at)}
      <RollingNumber value={balance}>{quantity}</RollingNumber>
      {line.slice(at + quantity.length)}
    </>
  );
}

/**
 * **Low stock**, which pops in when the stock falls to the mark and shrinks
 * away when it is filled again, rather than blinking on and off. While it
 * leaves it is already gone to a screen reader.
 */
export function LowStock({ low }: { low: boolean }) {
  const arrived = useArrived(low);
  const leaving = useLeaving(low);
  if (!low && !leaving) return null;
  return (
    <span
      aria-hidden={leaving || undefined}
      className={cn("inline-flex shrink-0", leaving ? "animate-pop-out" : arrived && "animate-pop")}
    >
      <StatusPill label={UI_TEXT.inventory.low} tone="cancelled" />
    </span>
  );
}
