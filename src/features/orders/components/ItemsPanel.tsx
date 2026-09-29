"use client";

import { PackageOpen, ReceiptText, type LucideIcon } from "lucide-react";
import { useState } from "react";

import { ActionRow } from "@/components/ui/action-row";
import { EmptyState } from "@/components/ui/empty-state";
import { ProductCard } from "@/components/ui/product-card";
import { SearchField } from "@/components/ui/search-field";
import { SkeletonRows } from "@/components/ui/skeleton";
import { UI_TEXT } from "@/constants/messages";
import type { Product } from "@/features/products/types";
import { formatPaise } from "@/lib/format/currency";

/** A way to add what the grid does not have: a custom item. */
function MoreRow({
  icon: Icon,
  title,
  hint,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <ActionRow
      onClick={onClick}
      wrap
      title={title}
      subtitle={hint}
      leading={
        <span
          aria-hidden="true"
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary"
        >
          <Icon size={20} strokeWidth={1.75} />
        </span>
      }
    />
  );
}

/**
 * The first step of a new order (plan §139.10): the products on the menu as a
 * grid, each with a + that adds one — and, once it is in the order, a − that
 * takes one off (the user, 2026-09-26) — searched by name; and, above them,
 * **Add custom item** for a request the menu does not cover (§139.11.7). A new product is made on
 * Products, and the draft waits (the user, 2026-09-25). There are no category
 * chips: products need none.
 */
export function ItemsPanel({
  products,
  loading,
  quantityOf,
  onAdd,
  onAddOrigin,
  onRemove,
  onAddCustom,
}: {
  /** Only what is on sale. */
  products: readonly Product[];
  loading: boolean;
  quantityOf: (productId: string) => number;
  onAdd: (productId: string) => void;
  /** The pressed + before the item count changes; used only for order choreography. */
  onAddOrigin?: (productId: string, origin: HTMLButtonElement) => void;
  onRemove: (productId: string) => void;
  onAddCustom: () => void;
}) {
  const text = UI_TEXT.newOrder;
  const [search, setSearch] = useState("");
  const needle = search.trim().toLowerCase();
  const shown = needle === "" ? products : products.filter((product) => product.name.toLowerCase().includes(needle));

  return (
    <section aria-labelledby="order-items-heading" className="space-y-4">
      <h2 id="order-items-heading" className="sr-only">
        {text.orderItems}
      </h2>
      {/* First, so a request the menu does not cover is one tap away however long the menu is (the user, 2026-09-27). */}
      <MoreRow icon={ReceiptText} title={text.customItem} hint={text.customItemHint} onClick={onAddCustom} />
      <SearchField value={search} onChange={setSearch} placeholder={text.searchProducts} />

      {loading ? (
        <div role="status" aria-busy="true" aria-label={text.searchProducts}>
          <SkeletonRows rows={2} height="h-40" />
        </div>
      ) : products.length === 0 ? (
        <EmptyState icon={PackageOpen} title={text.noProducts} hint={text.noProductsHint} />
      ) : shown.length === 0 ? (
        <p role="status" className="py-6 text-center text-sm text-text-muted">
          {text.noMatches(search.trim())}
        </p>
      ) : (
        // Columns by the panel's own width: on a desktop the panel shares the
        // screen with the order, so the window's width would pack four cards
        // into it and cut their names short.
        <div className="@container">
          <ul role="list" className="grid grid-cols-2 gap-3 @lg:grid-cols-3 @3xl:grid-cols-4">
            {shown.map((product, index) => {
              const quantity = quantityOf(product.id);
              return (
                <li key={product.id}>
                  <ProductCard
                    name={product.name}
                    price={formatPaise(product.defaultPrice)}
                    iconKey={product.iconKey}
                    priority={index === 0}
                    addLabel={text.add(product.name)}
                    onAdd={() => onAdd(product.id)}
                    onAddOrigin={(origin) => onAddOrigin?.(product.id, origin)}
                    quantity={quantity}
                    quantityLabel={text.inOrder(quantity)}
                    removeLabel={text.removeOne(product.name)}
                    onRemove={() => onRemove(product.id)}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
