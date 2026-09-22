"use client";

import React, { useState } from "react";
import useSWR from "swr";
import { AppShell } from "@/shared/components/AppShell";
import { Search, Plus, Package, Edit2 } from "lucide-react";
import { fetcher } from "@/shared/api/client";
import { type Product } from "@/features/products/types";
import { ProductFormSheet } from "@/features/products/components/ProductFormSheet";

export default function ProductsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: products, error, isLoading, mutate } = useSWR<Product[]>("/api/products", fetcher);

  const filteredProducts = products?.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatCurrency = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsFormOpen(true);
  };

  const handleAddNew = () => {
    setEditingProduct(undefined);
    setIsFormOpen(true);
  };

  return (
    <AppShell>
      <div className="space-y-6 lg:space-y-8 animate-fade-in-up pb-24 md:pb-8">
        
        {/* Header & Actions */}
        <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold font-heading text-text tracking-tight flex items-center gap-2">
              <Package size={28} className="text-primary" strokeWidth={2.5} />
              Menu / Products
            </h2>
            <p className="text-sm text-text-muted mt-1 font-medium">
              Manage what you sell
            </p>
          </div>
          <button
            onClick={handleAddNew}
            className="touch-target flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-text font-bold text-sm hover:bg-primary-hover active:scale-[0.98] transition-all shadow-md shrink-0"
          >
            <Plus size={18} strokeWidth={3} /> Add Product
          </button>
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
              placeholder="Search products..."
            />
          </div>
        </section>

        {/* State Handling & List */}
        <section>
          {error && (
            <div className="p-4 rounded-xl bg-danger-bg text-danger border border-danger/20 text-sm font-medium">
              Failed to load products. Please try again.
            </div>
          )}

          {isLoading && !products && (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-surface border border-border rounded-2xl animate-pulse" />
              ))}
            </div>
          )}

          {!isLoading && products?.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-16 h-16 bg-surface border border-border rounded-full flex items-center justify-center mb-4">
                <Package size={32} className="text-text-muted/40" strokeWidth={2} />
              </div>
              <h3 className="text-lg font-bold font-heading text-text mb-1">No products yet</h3>
              <p className="text-sm text-text-muted max-w-sm mb-6">
                Start adding items to your menu to take orders.
              </p>
              <button
                onClick={handleAddNew}
                className="touch-target flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary/10 text-primary font-bold text-sm hover:bg-primary/20 active:scale-[0.98] transition-all"
              >
                <Plus size={18} strokeWidth={3} /> Create First Product
              </button>
            </div>
          )}

          {filteredProducts && filteredProducts.length > 0 && (
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4" role="list">
              {filteredProducts.map(product => (
                <li key={product.id}>
                  <article className={`flex flex-col justify-between p-4 rounded-2xl bg-surface border border-border shadow-sm hover:shadow-md transition-all ${!product.isActive ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <h3 className="font-bold text-base text-text leading-tight mb-1">
                          {product.name}
                        </h3>
                        {product.description && (
                          <p className="text-xs text-text-muted font-medium line-clamp-2">
                            {product.description}
                          </p>
                        )}
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider shrink-0 ${product.isActive ? 'bg-success/10 text-success' : 'bg-text-muted/10 text-text-muted'}`}>
                        {product.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </div>
                    
                    <div className="flex items-end justify-between pt-3 border-t border-border/50">
                      <div>
                        <span className="font-bold font-heading text-lg text-primary block leading-none">
                          {formatCurrency(product.defaultPrice)}
                        </span>
                        <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider">
                          per {product.unit}
                        </span>
                      </div>
                      
                      <button 
                        onClick={() => handleEdit(product)}
                        className="touch-target flex items-center justify-center p-2 rounded-full bg-background border border-border text-text-muted hover:text-text hover:bg-surface-hover transition-colors active:scale-95"
                      >
                        <Edit2 size={16} strokeWidth={2.5} />
                      </button>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          )}

          {!isLoading && products && products.length > 0 && filteredProducts?.length === 0 && (
            <div className="text-center py-10">
              <p className="text-sm text-text-muted font-medium">No products found matching &quot;{searchQuery}&quot;</p>
            </div>
          )}
        </section>
      </div>

      <ProductFormSheet 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
        onSuccess={() => mutate()} 
        initialData={editingProduct}
      />
    </AppShell>
  );
}
