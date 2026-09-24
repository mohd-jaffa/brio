"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ArrowRightLeft, Package } from "lucide-react";

import { AppShell } from "@/components/nav/AppShell";
import { ProductTile } from "@/components/ui/product-tile";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { EmptyState } from "@/components/ui/empty-state";
import { ListScreen } from "@/components/ui/list-screen";
import { PageHeader } from "@/components/ui/page-header";
import { SearchInput } from "@/components/ui/search-input";
import { LOW_STOCK_THRESHOLD } from "@/constants/inventory";
import { UI_TEXT } from "@/constants/messages";
import { InventoryAdjustmentSheet } from "@/features/inventory/components/InventoryAdjustmentSheet";
import type { InventoryBalance } from "@/features/inventory/types";
import type { Product } from "@/features/products/types";
import { useDisclosure } from "@/hooks/useDisclosure";
import { formatQuantity } from "@/lib/format/quantity";
import { apiRoutes } from "@/lib/query/keys";
import { useApiQuery } from "@/lib/query/useApiQuery";

interface StockLine extends Product {
  currentStock: number;
}

/**
 * What is in stock, per active product, lowest first — so whatever needs
 * ordering is at the top (plan §20). The balances endpoint answers with one
 * row per product that has ever moved; a product with no movements is at zero.
 */
function stockLines(
  products: readonly Product[],
  balances: readonly InventoryBalance[],
  search: string,
): StockLine[] {
  const byProduct = new Map(balances.map((balance) => [balance.productId, balance.balance]));
  const needle = search.trim().toLowerCase();

  return products
    .filter((product) => product.isActive && product.name.toLowerCase().includes(needle))
    .map((product) => ({ ...product, currentStock: byProduct.get(product.id) ?? 0 }))
    .sort((a, b) => a.currentStock - b.currentStock);
}

export default function InventoryPage() {
  const [search, setSearch] = useState("");
  const adjust = useDisclosure<Product>();

  const products = useApiQuery<Product[]>(apiRoutes.products.list);
  const balances = useApiQuery<InventoryBalance[]>(apiRoutes.inventory.balances());

  const lines = useMemo(
    () => stockLines(products.data ?? [], balances.data ?? [], search),
    [products.data, balances.data, search],
  );

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

  const settled = products.data !== undefined && balances.data !== undefined;
  const searchedInVain = settled && lines.length === 0 && search.trim() !== "";

  return (
    <AppShell>
      <PageHeader icon={Package} title="Inventory" subtitle="Manage your stock and ingredients" />

      <SearchInput value={search} onChange={setSearch} placeholder="Search active products" />

      <ListScreen
        query={query}
        loadFailed="INVENTORY_LOAD_FAILED"
        data={settled ? lines : undefined}
        keyOf={(line) => line.id}
        noMatches={searchedInVain ? UI_TEXT.states.noResults(search) : undefined}
        empty={
          <EmptyState
            icon={Package}
            title="No active products"
            hint="Add active products in the Menu to manage their stock."
          />
        }
        renderItem={(line) => {
          const low = line.currentStock <= LOW_STOCK_THRESHOLD;
          return (
            <article
              className={cn(
                "flex items-center justify-between rounded-2xl border bg-surface p-4 shadow-sm transition-all hover:shadow-md",
                low ? "border-danger/30" : "border-border",
              )}
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <ProductTile iconKey={line.iconKey} size="md" />

                <div className="min-w-0 pr-2">
                  <h2 className="mb-1 truncate text-base font-bold leading-tight text-text">{line.name}</h2>
                  <p className={cn("tabular text-sm font-semibold", low ? "text-danger" : "text-text-muted")}>
                    {formatQuantity(line.currentStock, line.unit)} in stock
                  </p>
                  {low && (
                    <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-danger">
                      <AlertTriangle size={10} strokeWidth={3} aria-hidden="true" /> Low stock
                    </span>
                  )}
                </div>
              </div>

              <Button
                icon={ArrowRightLeft}
                label="Adjust"
                variant="ghost"
                size="sm"
                onClick={() => adjust.open(line)}
              />
            </article>
          );
        }}
      />

      <InventoryAdjustmentSheet
        isOpen={adjust.isOpen}
        onClose={adjust.close}
        onSuccess={() => balances.mutate()}
        product={adjust.subject}
      />
    </AppShell>
  );
}
