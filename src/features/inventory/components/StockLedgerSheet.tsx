"use client";

import Link from "next/link";
import { PackagePlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ListScreen } from "@/components/ui/list-screen";
import { RollingNumber } from "@/components/ui/rolling-number";
import { Sheet } from "@/components/ui/sheet";
import { UI_TEXT } from "@/constants/messages";
import { INVENTORY_TRANSACTION_LABELS } from "@/constants/statuses";
import type { Product } from "@/features/products/types";
import { useKept } from "@/hooks/useKept";
import { useLeaving } from "@/hooks/useLeaving";
import { useListMotion } from "@/hooks/useListMotion";
import { formatDateTime } from "@/lib/format/date";
import { formatQuantity } from "@/lib/format/quantity";
import { apiRoutes, withQuery } from "@/lib/query/keys";
import { useApiPages } from "@/lib/query/useApiPages";

import type { InventoryBalance, InventoryTransaction } from "../types";

/** A movement's size, signed as it moved stock: "+10 kg", "−2 boxes". */
function signed(quantity: number, unit: string): string {
  return `${quantity > 0 ? "+" : "−"}${formatQuantity(Math.abs(quantity), unit)}`;
}

/**
 * The ledger, newest first. A movement recorded while the sheet is open opens
 * its own room at the top (`useListMotion`, `open`), so the sheet — sized to
 * its ledger — grows smoothly rather than jumping. It is made anew for each
 * product, so opening another is a first showing, not a change.
 */
function Movements({ label, unit, items }: { label: string; unit: string; items: readonly InventoryTransaction[] }) {
  const text = UI_TEXT.inventory;
  const list = useListMotion<HTMLUListElement>({ arrival: "open" });
  return (
    <ul ref={list} role="list" aria-label={label} className="relative divide-y divide-border">
      {items.map((movement) => (
        <li key={movement.id} className="flex items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-text">{INVENTORY_TRANSACTION_LABELS[movement.type]}</p>
            <p className="text-xs text-text-muted">
              {formatDateTime(movement.createdAt)}
              {movement.referenceType === "ORDER" && movement.referenceId && (
                <>
                  {" · "}
                  <Link
                    href={`/orders/${movement.referenceId}`}
                    className="hit-area-line rounded font-medium text-primary hover:underline"
                  >
                    {text.viewOrder}
                  </Link>
                </>
              )}
            </p>
          </div>
          <p className="shrink-0 text-sm font-semibold tabular-nums text-text">{signed(movement.quantity, unit)}</p>
        </li>
      ))}
    </ul>
  );
}

/**
 * One product's stock (plan §139.10, §14): what is on the shelf now, and the
 * ledger that made it, newest first a page at a time — what came in, what
 * orders reserved, used or released, each order's line opening that order,
 * and what was adjusted or wasted. **Record stock** adds a movement.
 *
 * While Record stock is open over it (`covered`), and until that has left,
 * the sheet keeps what it showed: its size too, so it does not grow unseen
 * behind the form. Then it takes the new stock where it can be seen: the
 * figure on the shelf rolls the way it moved, and the movement opens its room
 * at the top of the ledger as the sheet grows to hold it.
 */
export function StockLedgerSheet({
  product,
  level,
  onClose,
  onRecord,
  covered = false,
}: {
  /** The product whose stock is open; none while the sheet is closed. */
  product: Product | undefined;
  level: InventoryBalance | undefined;
  onClose: () => void;
  onRecord: (product: Product) => void;
  /** Whether Record stock is open over it. */
  covered?: boolean;
}) {
  const text = UI_TEXT.inventory;
  // It leaves showing the product it opened for, its ledger with it.
  const shown = useKept(product, product !== undefined);
  const uncovering = useLeaving(covered);
  const live = !covered && !uncovering;
  const stock = useKept(level, product !== undefined && live);
  const movements = useApiPages<InventoryTransaction>(
    shown ? withQuery(apiRoutes.inventory.transactions, { product: shown.id }) : null,
  );
  const entries = useKept(movements.data, live);

  return (
    <Sheet open={product !== undefined} onClose={onClose} title={shown?.name ?? text.history}>
      {shown && (
        <div className="space-y-4 pb-2">
          <div className="flex items-end justify-between gap-3 rounded-2xl bg-sunken p-4">
            <div>
              <p className="text-xs text-text-muted">{text.onShelf}</p>
              <p className="font-heading text-2xl font-medium tabular-nums text-text">
                {stock?.stocked ? (
                  <RollingNumber key={shown.id} value={stock.balance}>
                    {formatQuantity(stock.balance, shown.unit)}
                  </RollingNumber>
                ) : (
                  text.notCounted
                )}
              </p>
            </div>
            <Button
              label={text.record}
              icon={PackagePlus}
              variant="secondary"
              size="sm"
              onClick={() => onRecord(shown)}
            />
          </div>
          <ListScreen
            query={movements}
            loadFailed="INVENTORY_LOAD_FAILED"
            data={entries}
            empty={<p className="py-6 text-center text-sm text-text-muted">{text.noMovements}</p>}
            renderList={(items) => (
              <Movements key={shown.id} label={text.movements(shown.name)} unit={shown.unit} items={items} />
            )}
          />
        </div>
      )}
    </Sheet>
  );
}
