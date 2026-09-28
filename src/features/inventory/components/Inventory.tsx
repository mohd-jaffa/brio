"use client";

import { useState } from "react";

import { cn } from "@/components/ui/cn";
import { EmptyState } from "@/components/ui/empty-state";
import { lazySheet } from "@/components/ui/lazy-sheet";
import { ListScreen } from "@/components/ui/list-screen";
import { PageHeader } from "@/components/ui/page-header";
import { ProductTile } from "@/components/ui/product-tile";
import { Row, RowList } from "@/components/ui/row";
import { SearchField } from "@/components/ui/search-field";
import { StatusPill } from "@/components/ui/status-pill";
import { LOW_STOCK_THRESHOLD } from "@/constants/inventory";
import { UI_TEXT } from "@/constants/messages";
import type { Product } from "@/features/products/types";
import { useDisclosure } from "@/hooks/useDisclosure";
import { formatQuantity } from "@/lib/format/quantity";
import { apiRoutes } from "@/lib/query/keys";
import { useApiQuery } from "@/lib/query/useApiQuery";

import type { InventoryBalance } from "../types";

/** Kept out of the screen's first download, and fetched once it is idle (`lazySheet`). */
const InventoryAdjustmentSheet = lazySheet(
  () => import("./InventoryAdjustmentSheet").then((module) => module.InventoryAdjustmentSheet),
  (props) => props.isOpen,
);
const StockLedgerSheet = lazySheet(
  () => import("./StockLedgerSheet").then((module) => module.StockLedgerSheet),
  (props) => props.product !== undefined,
);

interface StockLine {
  product: Product;
  level: InventoryBalance | undefined;
}

const stocked = (line: StockLine) => line.level?.stocked === true;
const low = (line: StockLine) => line.level?.stocked === true && line.level.balance <= LOW_STOCK_THRESHOLD;

/**
 * The products on sale with what is on the shelf, those whose stock is kept
 * first, emptiest first; then the ones made to order, whose stock nobody
 * counts, by name — the rule the oversell guard uses (0015).
 */
function stockLines(products: readonly Product[], levels: readonly InventoryBalance[], search: string): StockLine[] {
  const needle = search.trim().toLowerCase();
  const byProduct = new Map(levels.map((level) => [level.productId, level]));
  return products
    .filter((product) => product.isActive && product.name.toLowerCase().includes(needle))
    .map((product) => ({ product, level: byProduct.get(product.id) }))
    .sort(
      (a, b) =>
        Number(stocked(b)) - Number(stocked(a)) ||
        (a.level?.balance ?? 0) - (b.level?.balance ?? 0) ||
        a.product.name.localeCompare(b.product.name),
    );
}

/**
 * Inventory (plan §139.10, R5.7): each product on sale with its stock — or
 * that it is made to order — and **Low stock** at or under the mark. A row
 * opens that product's history, where **Record stock** adds a movement (the
 * sheet no longer crashes, §134 P0-1). The balances are added up in the
 * database (`stock_levels`), however long the ledger grows.
 */
export function Inventory() {
  const text = UI_TEXT.inventory;
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<Product | undefined>();
  const record = useDisclosure<Product>();

  const products = useApiQuery<Product[]>(apiRoutes.products.list);
  const balances = useApiQuery<InventoryBalance[]>(apiRoutes.inventory.balances());

  // One list, two reads: it is loading until both have answered, and failed if either did.
  const query = {
    isLoading: products.isLoading || balances.isLoading,
    error: products.error ?? balances.error,
    isValidating: products.isValidating || balances.isValidating,
    mutate: () => {
      void products.mutate();
      void balances.mutate();
    },
  };
  const lines =
    products.data && balances.data ? stockLines(products.data, balances.data, search) : undefined;
  const level = (product: Product | undefined) => balances.data?.find((entry) => entry.productId === product?.id);

  return (
    <div className="space-y-4">
      <PageHeader title={text.title} subtitle={text.subtitle} />

      <SearchField value={search} onChange={setSearch} placeholder={text.search} />

      <ListScreen
        query={query}
        loadFailed="INVENTORY_LOAD_FAILED"
        data={lines}
        noMatches={search.trim() ? UI_TEXT.states.noResults(search.trim()) : undefined}
        empty={<EmptyState art="storefront" title={text.emptyTitle} hint={text.emptyHint} />}
        renderList={(items) => (
          <RowList label={text.list}>
            {items.map((line) => (
              <Row
                key={line.product.id}
                onClick={() => setOpen(line.product)}
                leading={<ProductTile iconKey={line.product.iconKey} />}
                title={line.product.name}
                // On a phone the pill sits on the stock line, as on Products, so the
                // name keeps the row's width. From 1024 px, where the row is wide, a
                // counted product's stock moves to the right-hand column, where the
                // eye runs down the list to compare.
                subtitle={
                  <span className={cn("flex items-center gap-2", line.level?.stocked && "lg:hidden")}>
                    <span className="min-w-0 truncate">
                      {line.level?.stocked
                        ? text.inStock(formatQuantity(line.level.balance, line.product.unit))
                        : text.notCounted}
                    </span>
                    {low(line) && <StatusPill label={text.low} tone="cancelled" />}
                  </span>
                }
                trailing={
                  line.level?.stocked ? (
                    <span className="hidden flex-col items-end gap-1.5 lg:flex">
                      <span className="tabular-nums">{text.inStock(formatQuantity(line.level.balance, line.product.unit))}</span>
                      {low(line) && <StatusPill label={text.low} tone="cancelled" />}
                    </span>
                  ) : undefined
                }
              />
            ))}
          </RowList>
        )}
      />

      <StockLedgerSheet
        product={open}
        level={level(open)}
        onClose={() => setOpen(undefined)}
        onRecord={(product) => record.open(product)}
      />
      <InventoryAdjustmentSheet isOpen={record.isOpen} onClose={record.close} product={record.subject} />
    </div>
  );
}
