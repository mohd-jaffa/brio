"use client";

import { MoreHorizontal, Package, PackagePlus, Pencil, PauseCircle, PlayCircle } from "lucide-react";
import { useState } from "react";

import { Button, IconButton } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { EmptyState } from "@/components/ui/empty-state";
import { Fab } from "@/components/ui/fab";
import { lazySheet } from "@/components/ui/lazy-sheet";
import { ListScreen } from "@/components/ui/list-screen";
import { PageHeader } from "@/components/ui/page-header";
import { ProductTile } from "@/components/ui/product-tile";
import { useResponse } from "@/components/ui/response-card";
import { Row, RowList } from "@/components/ui/row";
import { SearchField } from "@/components/ui/search-field";
import { Sheet } from "@/components/ui/sheet";
import { StatusPill } from "@/components/ui/status-pill";
import { UI_TEXT } from "@/constants/messages";
import { useDisclosure } from "@/hooks/useDisclosure";
import { useKept } from "@/hooks/useKept";
import { formatPaise } from "@/lib/format/currency";
import { apiRoutes } from "@/lib/query/keys";
import { useApiMutation } from "@/lib/query/useApiMutation";
import { useApiQuery } from "@/lib/query/useApiQuery";

import { ProductsClient } from "../api.client";
import type { Product } from "../types";

/** Kept out of the screen's first download, and fetched once it is idle (`lazySheet`). */
const InventoryAdjustmentSheet = lazySheet(
  () => import("@/features/inventory/components/InventoryAdjustmentSheet").then((module) => module.InventoryAdjustmentSheet),
  (props) => props.isOpen,
);
const ProductFormSheet = lazySheet(
  () => import("./ProductFormSheet").then((module) => module.ProductFormSheet),
  (props) => props.isOpen,
);

const text = UI_TEXT.products;

/** Whether it can be ordered, as the pill beside it says. */
function SalePill({ product }: { product: Product }) {
  return product.isActive ? (
    <StatusPill label={text.active} tone="delivered" />
  ) : (
    <StatusPill label={text.inactive} tone="neutral" />
  );
}

/**
 * A product as a phone lists it: tile, name, then its price per unit with the
 * pill — on the second line, so the name keeps the row's width — and its menu.
 */
function ProductRow({ product, onMore }: { product: Product; onMore: () => void }) {
  return (
    <Row
      leading={<ProductTile iconKey={product.iconKey} />}
      title={product.name}
      subtitle={
        <span className="flex items-center gap-2">
          <span className="min-w-0 truncate tabular-nums">
            {formatPaise(product.defaultPrice)} {text.perUnit(product.unit)}
          </span>
          <SalePill product={product} />
        </span>
      }
      trailing={<IconButton icon={MoreHorizontal} label={text.actions(product.name)} onClick={onMore} />}
    />
  );
}

/** A product as a desktop shows it: its picture large, then the same facts. */
function ProductCard({ product, onMore }: { product: Product; onMore: () => void }) {
  return (
    <article
      aria-label={product.name}
      className={cn(
        "flex h-full flex-col gap-3 rounded-2xl border border-border bg-surface p-3 shadow-card",
        !product.isActive && "opacity-70",
      )}
    >
      <ProductTile iconKey={product.iconKey} size="fill" />
      <div className="flex min-w-0 flex-1 flex-col gap-1 px-1">
        <p className="text-sm font-semibold leading-snug text-text">{product.name}</p>
        <p className="text-sm tabular-nums text-text-muted">
          {formatPaise(product.defaultPrice)} {text.perUnit(product.unit)}
        </p>
      </div>
      <div className="flex items-center justify-between gap-2 px-1">
        <SalePill product={product} />
        <IconButton icon={MoreHorizontal} label={text.actions(product.name)} onClick={onMore} />
      </div>
    </article>
  );
}

/**
 * What can be done to one product (plan §139.10): edit it, take it off sale
 * or put it back — it then leaves or rejoins the order screen — and record
 * stock for it.
 */
function ProductActions({
  product,
  onClose,
  onEdit,
  onStock,
}: {
  product: Product | undefined;
  onClose: () => void;
  onEdit: (product: Product) => void;
  onStock: (product: Product) => void;
}) {
  // It leaves showing the product it opened for.
  const shown = useKept(product, product !== undefined);
  const respond = useResponse();
  const toggle = useApiMutation<Product, Product>(
    (subject) => ProductsClient.updateProduct(subject.id, { isActive: !subject.isActive }),
    {
      revalidate: [apiRoutes.products.list],
      onSuccess: (saved) =>
        respond.success({
          title: saved.isActive ? UI_TEXT.outcomes.productResumed : UI_TEXT.outcomes.productPaused,
          message: saved.isActive
            ? UI_TEXT.outcomes.productOnSaleNote(saved.name)
            : UI_TEXT.outcomes.productOffSaleNote(saved.name),
        }),
      onError: (failure) =>
        respond.failure(failure, { title: UI_TEXT.outcomes.productNotSaved, fallback: "SAVE_FAILED" }),
    },
  );

  return (
    <Sheet open={product !== undefined} onClose={onClose} title={shown?.name ?? text.title}>
      {shown && (
        <ul className="space-y-2 pb-2">
          {[
            { label: text.edit, icon: Pencil, run: () => onEdit(shown) },
            {
              label: shown.isActive ? text.takeOff : text.putOn,
              icon: shown.isActive ? PauseCircle : PlayCircle,
              run: () => void toggle.submit(shown),
            },
            { label: text.stock, icon: PackagePlus, run: () => onStock(shown) },
          ].map((action) => (
            <li key={action.label}>
              <Button
                label={action.label}
                icon={action.icon}
                variant="ghost"
                fullWidth
                onClick={() => {
                  onClose();
                  action.run();
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}

/**
 * Products (plan §139.10, R5.6): what the business sells, found by name and
 * known by its picture — there are no categories (2026-09-25). Rows on a
 * phone and a tablet, cards from 1024 px; each product's menu edits it, takes
 * it off sale or puts it back, and records stock. **+** adds one.
 *
 * The whole menu is read at once, as the order screen reads it: a business's
 * products are a menu, not a ledger.
 */
export function Products() {
  const [search, setSearch] = useState("");
  const form = useDisclosure<Product>();
  const stock = useDisclosure<Product>();
  const [acting, setActing] = useState<Product | undefined>();
  const query = useApiQuery<Product[]>(apiRoutes.products.list);

  const needle = search.trim().toLowerCase();
  const shown = query.data?.filter((product) => product.name.toLowerCase().includes(needle));

  return (
    <div className="space-y-4">
      <PageHeader title={text.title} subtitle={text.subtitle}>
        <Fab label={text.add} onClick={() => form.open()} />
      </PageHeader>

      <SearchField value={search} onChange={setSearch} placeholder={text.search} />

      <ListScreen
        query={query}
        loadFailed="PRODUCTS_LOAD_FAILED"
        data={shown}
        noMatches={needle ? UI_TEXT.states.noResults(search.trim()) : undefined}
        empty={
          <EmptyState
            icon={Package}
            title={text.emptyTitle}
            hint={text.emptyHint}
            action={<Button label={text.add} variant="secondary" onClick={() => form.open()} />}
          />
        }
        renderList={(items) => (
          <>
            <RowList label={text.list} className="lg:hidden">
              {items.map((product) => (
                <ProductRow key={product.id} product={product} onMore={() => setActing(product)} />
              ))}
            </RowList>
            <ul role="list" aria-label={text.list} className="hidden grid-cols-3 gap-4 lg:grid xl:grid-cols-4">
              {items.map((product) => (
                <li key={product.id}>
                  <ProductCard product={product} onMore={() => setActing(product)} />
                </li>
              ))}
            </ul>
          </>
        )}
      />

      <ProductActions product={acting} onClose={() => setActing(undefined)} onEdit={form.open} onStock={stock.open} />
      <ProductFormSheet isOpen={form.isOpen} onClose={form.close} initialData={form.subject} />
      <InventoryAdjustmentSheet isOpen={stock.isOpen} onClose={stock.close} product={stock.subject} />
    </div>
  );
}
