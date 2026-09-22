"use client";

import React, { useState, useMemo } from "react";
import useSWR from "swr";
import { AppShell } from "@/shared/components/AppShell";
import { Search, Package, AlertTriangle, ArrowRightLeft } from "lucide-react";
import { fetcher } from "@/shared/api/client";
import { type Product } from "@/features/products/types";
import { InventoryAdjustmentSheet } from "@/features/inventory/components/InventoryAdjustmentSheet";

export default function InventoryPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: products, error: productsError, isLoading: isLoadingProducts } = useSWR<Product[]>("/api/products", fetcher);
  const { data: balances, error: balancesError, isLoading: isLoadingBalances, mutate: mutateBalances } = useSWR<Record<string, number>>("/api/inventory/balance", fetcher);

  const isLoading = isLoadingProducts || isLoadingBalances;
  const error = productsError || balancesError;

  const inventoryList = useMemo(() => {
    if (!products || !balances) return [];
    
    return products
      .filter(p => p.isActive) // Only manage inventory for active products normally
      .map(p => ({
        ...p,
        currentStock: balances[p.id] || 0
      }))
      .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => a.currentStock - b.currentStock); // Lowest stock first
  }, [products, balances, searchQuery]);

  const handleAdjust = (product: Product) => {
    setSelectedProduct(product);
    setIsFormOpen(true);
  };

  return (
    <AppShell>
      <div className="space-y-6 lg:space-y-8 animate-fade-in-up pb-24 md:pb-8">
        
        {/* Header */}
        <section>
          <h2 className="text-2xl sm:text-3xl font-bold font-heading text-text tracking-tight flex items-center gap-2">
            <Package size={28} className="text-primary" strokeWidth={2.5} />
            Inventory
          </h2>
          <p className="text-sm text-text-muted mt-1 font-medium">
            Manage your stock and ingredients
          </p>
        </section>

        {/* Search */}
        <section>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search size={18} className="text-text-muted/60" strokeWidth={2.5} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-surface border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm font-medium placeholder:text-text-muted/60 shadow-sm"
              placeholder="Search active products..."
            />
          </div>
        </section>

        {/* State Handling & List */}
        <section>
          {error && (
            <div className="p-4 rounded-xl bg-danger-bg text-danger border border-danger/20 text-sm font-medium">
              Failed to load inventory data. Please try again.
            </div>
          )}

          {isLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-surface border border-border rounded-2xl animate-pulse" />
              ))}
            </div>
          )}

          {!isLoading && inventoryList.length === 0 && !searchQuery && (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-16 h-16 bg-surface border border-border rounded-full flex items-center justify-center mb-4">
                <Package size={32} className="text-text-muted/40" strokeWidth={2} />
              </div>
              <h3 className="text-lg font-bold font-heading text-text mb-1">No active products</h3>
              <p className="text-sm text-text-muted max-w-sm">
                Add active products in the Menu to manage their stock.
              </p>
            </div>
          )}

          {!isLoading && inventoryList.length > 0 && (
            <ul className="space-y-3" role="list">
              {inventoryList.map(item => {
                const isLowStock = item.currentStock <= 5; // Simple hardcoded threshold for MVP

                return (
                  <li key={item.id}>
                    <article className={`flex items-center justify-between p-4 rounded-2xl bg-surface border ${isLowStock ? 'border-danger/30 shadow-sm' : 'border-border shadow-sm'} hover:shadow-md transition-all`}>
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        {/* Stock indicator badge */}
                        <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 border ${
                          isLowStock ? 'bg-danger/10 border-danger/20 text-danger' : 'bg-primary/10 border-primary/20 text-primary'
                        }`}>
                          <span className="font-bold font-heading text-lg leading-none">{item.currentStock}</span>
                          <span className="text-[9px] font-bold uppercase tracking-wider mt-0.5">{item.unit}</span>
                        </div>
                        
                        <div className="min-w-0 pr-2">
                          <h3 className="font-bold text-base text-text leading-tight mb-1 truncate">
                            {item.name}
                          </h3>
                          {isLowStock && (
                            <span className="text-[10px] font-bold text-danger uppercase tracking-wider flex items-center gap-1">
                              <AlertTriangle size={10} strokeWidth={3} /> Low Stock
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => handleAdjust(item)}
                        className="touch-target flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-background border border-border text-text font-bold text-xs hover:bg-surface-hover active:scale-95 transition-all shrink-0"
                      >
                        <ArrowRightLeft size={14} strokeWidth={2.5} className="text-text-muted" />
                        Adjust
                      </button>
                    </article>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <InventoryAdjustmentSheet 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
        onSuccess={() => mutateBalances()} 
        product={selectedProduct}
      />
    </AppShell>
  );
}
