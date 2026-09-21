"use client";

import React, { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { AppShell } from "@/shared/components/AppShell";
import { Search, Plus, Users, ChevronRight } from "lucide-react";
import { fetcher } from "@/shared/api/client";
import { type Customer } from "@/modules/customers/customers.types";
import { CustomerFormSheet } from "./_components/CustomerFormSheet";

export default function CustomersPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: customers, error, isLoading, mutate } = useSWR<Customer[]>("/api/customers", fetcher);

  const filteredCustomers = customers?.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.phone.includes(searchQuery)
  );

  return (
    <AppShell>
      <div className="space-y-6 lg:space-y-8 animate-fade-in-up pb-24 md:pb-8">
        
        {/* Header & Actions */}
        <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold font-heading text-text tracking-tight flex items-center gap-2">
              <Users size={28} className="text-primary" strokeWidth={2.5} />
              Customers
            </h2>
            <p className="text-sm text-text-muted mt-1 font-medium">
              Manage your bakery&apos;s clients
            </p>
          </div>
          <button
            onClick={() => setIsFormOpen(true)}
            className="touch-target flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-text font-bold text-sm hover:bg-primary-hover active:scale-[0.98] transition-all shadow-md shrink-0"
          >
            <Plus size={18} strokeWidth={3} /> Add Customer
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
              placeholder="Search by name or phone..."
            />
          </div>
        </section>

        {/* State Handling & List */}
        <section>
          {error && (
            <div className="p-4 rounded-xl bg-danger-bg text-danger border border-danger/20 text-sm font-medium">
              Failed to load customers. Please try again.
            </div>
          )}

          {isLoading && !customers && (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-surface border border-border rounded-2xl animate-pulse" />
              ))}
            </div>
          )}

          {!isLoading && customers?.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-16 h-16 bg-surface border border-border rounded-full flex items-center justify-center mb-4">
                <Users size={32} className="text-text-muted/40" strokeWidth={2} />
              </div>
              <h3 className="text-lg font-bold font-heading text-text mb-1">No customers yet</h3>
              <p className="text-sm text-text-muted max-w-sm mb-6">
                Start adding your customers to track their orders and preferences.
              </p>
              <button
                onClick={() => setIsFormOpen(true)}
                className="touch-target flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary/10 text-primary font-bold text-sm hover:bg-primary/20 active:scale-[0.98] transition-all"
              >
                <Plus size={18} strokeWidth={3} /> Add Your First Customer
              </button>
            </div>
          )}

          {filteredCustomers && filteredCustomers.length > 0 && (
            <ul className="space-y-3" role="list">
              {filteredCustomers.map(customer => (
                <li key={customer.id}>
                  <Link href={`/customers/${customer.id}`}>
                    <article className="flex items-center justify-between p-4 rounded-2xl bg-surface border border-border shadow-sm hover:bg-surface-hover hover:shadow-md active:scale-[0.99] transition-all group">
                      <div className="flex items-center gap-4">
                        {/* Avatar */}
                        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary font-bold font-heading text-lg flex items-center justify-center border border-primary/20 shrink-0">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        {/* Info */}
                        <div>
                          <span className="font-bold text-base block group-hover:text-primary transition-colors text-text">
                            {customer.name}
                          </span>
                          <span className="text-xs text-text-muted font-medium mt-0.5 block flex items-center gap-1.5">
                            {customer.phone}
                          </span>
                        </div>
                      </div>
                      <ChevronRight size={20} className="text-text-muted/40 group-hover:text-primary transition-colors" />
                    </article>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {!isLoading && customers && customers.length > 0 && filteredCustomers?.length === 0 && (
            <div className="text-center py-10">
              <p className="text-sm text-text-muted font-medium">No customers found matching &quot;{searchQuery}&quot;</p>
            </div>
          )}
        </section>
      </div>

      <CustomerFormSheet 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
        onSuccess={() => mutate()} 
      />
    </AppShell>
  );
}
