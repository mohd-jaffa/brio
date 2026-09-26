"use client";

import Link from "next/link";
import { PackagePlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ListScreen } from "@/components/ui/list-screen";
import { Sheet } from "@/components/ui/sheet";
import { UI_TEXT } from "@/constants/messages";
import { INVENTORY_TRANSACTION_LABELS } from "@/constants/statuses";
import type { Product } from "@/features/products/types";
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
 * One product's stock (plan §139.10, §14): what is on the shelf now, and the
 * ledger that made it, newest first a page at a time — what came in, what
 * orders reserved, used or released, each order's line opening that order,
 * and what was adjusted or wasted. **Record stock** adds a movement.
 */
export function StockLedgerSheet({
  product,
  level,
  onClose,
  onRecord,
}: {
  /** The product whose stock is open; none while the sheet is closed. */
  product: Product | undefined;
  level: InventoryBalance | undefined;
  onClose: () => void;
  onRecord: (product: Product) => void;
}) {
  const text = UI_TEXT.inventory;
  const movements = useApiPages<InventoryTransaction>(
    product ? withQuery(apiRoutes.inventory.transactions, { product: product.id }) : null,
  );

  return (
    <Sheet open={product !== undefined} onClose={onClose} title={product?.name ?? text.history}>
      {product && (
        <div className="space-y-4 pb-2">
          <div className="flex items-end justify-between gap-3 rounded-2xl bg-sunken p-4">
            <div>
              <p className="text-xs text-text-muted">{text.onShelf}</p>
              <p className="font-heading text-2xl font-medium tabular-nums text-text">
                {level?.stocked ? formatQuantity(level.balance, product.unit) : text.notCounted}
              </p>
            </div>
            <Button label={text.record} icon={PackagePlus} variant="secondary" size="sm" onClick={() => onRecord(product)} />
          </div>
          <ListScreen
            query={movements}
            loadFailed="INVENTORY_LOAD_FAILED"
            data={movements.data}
            empty={<p className="py-6 text-center text-sm text-text-muted">{text.noMovements}</p>}
            renderList={(items) => (
              <ul role="list" aria-label={text.movements(product.name)} className="divide-y divide-border">
                {items.map((movement) => (
                  <li key={movement.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text">{INVENTORY_TRANSACTION_LABELS[movement.type]}</p>
                      <p className="text-xs text-text-muted">
                        {formatDateTime(movement.createdAt)}
                        {movement.referenceType === "ORDER" && movement.referenceId && (
                          <>
                            {" · "}
                            <Link href={`/orders/${movement.referenceId}`} className="font-medium text-primary">
                              {text.viewOrder}
                            </Link>
                          </>
                        )}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold tabular-nums text-text">
                      {signed(movement.quantity, product.unit)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          />
        </div>
      )}
    </Sheet>
  );
}
