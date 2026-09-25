"use client";

import { useState } from "react";
import { Edit2, Package, Plus } from "lucide-react";

import { AppShell } from "@/components/nav/AppShell";
import { Button, IconButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ListScreen } from "@/components/ui/list-screen";
import { PageHeader } from "@/components/ui/page-header";
import { SearchField } from "@/components/ui/search-field";
import { ProductTile } from "@/components/ui/product-tile";
import { StatusPill } from "@/components/ui/status-pill";
import { UI_TEXT } from "@/constants/messages";
import { ProductFormSheet } from "@/features/products/components/ProductFormSheet";
import type { Product } from "@/features/products/types";
import { useDisclosure } from "@/hooks/useDisclosure";
import { formatPaise } from "@/lib/format/currency";
import { apiRoutes } from "@/lib/query/keys";
import { useApiQuery } from "@/lib/query/useApiQuery";

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const form = useDisclosure<Product>();
  const query = useApiQuery<Product[]>(apiRoutes.products.list);

  const needle = search.trim().toLowerCase();
  const shown = query.data?.filter((product) => product.name.toLowerCase().includes(needle));
  const searchedInVain = Boolean(query.data?.length) && shown?.length === 0;

  return (
    <AppShell>
      <PageHeader title="Menu / Products" subtitle="Manage what you sell">
        <Button icon={Plus} label="Add Product" onClick={() => form.open()} />
      </PageHeader>

      <SearchField value={search} onChange={setSearch} placeholder="Search products" />

      <ListScreen
        query={query}
        loadFailed="PRODUCTS_LOAD_FAILED"
        data={shown}
        columns={2}
        keyOf={(product) => product.id}
        noMatches={searchedInVain ? UI_TEXT.states.noResults(search) : undefined}
        empty={
          <EmptyState
            icon={Package}
            title="No products yet"
            hint="Start adding items to your menu to take orders."
            action={
              <Button
                icon={Plus}
                label="Create First Product"
                variant="secondary"
                onClick={() => form.open()}
              />
            }
          />
        }
        renderItem={(product) => (
          <article
            className={`flex h-full flex-col justify-between rounded-2xl border border-border bg-surface p-4 shadow-sm transition-all hover:shadow-md ${
              product.isActive ? "" : "opacity-60 grayscale-[0.5]"
            }`}
          >
            <div className="mb-3 flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <ProductTile iconKey={product.iconKey} size="md" />
                <div className="min-w-0">
                  <h2 className="mb-1 text-base font-bold leading-tight text-text">{product.name}</h2>
                  {product.description && (
                    <p className="line-clamp-2 text-xs font-medium text-text-muted">{product.description}</p>
                  )}
                </div>
              </div>
              <StatusPill
                label={product.isActive ? "Active" : "Inactive"}
                tone={product.isActive ? "delivered" : "neutral"}
              />
            </div>

            <div className="flex items-end justify-between border-t border-border/50 pt-3">
              <div>
                <span className="block font-heading text-lg font-bold leading-none text-primary">
                  {formatPaise(product.defaultPrice)}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  per {product.unit}
                </span>
              </div>
              <IconButton
                icon={Edit2}
                label={`Edit ${product.name}`}
                onClick={() => form.open(product)}
              />
            </div>
          </article>
        )}
      />

      <ProductFormSheet
        isOpen={form.isOpen}
        onClose={form.close}
        onSuccess={() => query.mutate()}
        initialData={form.subject}
      />
    </AppShell>
  );
}
