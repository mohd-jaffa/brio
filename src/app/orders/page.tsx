"use client";

import React, { useState, useMemo } from "react";
import useSWR from "swr";
import Link from "next/link";
import { AppShell } from "@/shared/components/AppShell";
import { Search, Plus, ShoppingBag, Clock } from "lucide-react";
import { fetcher } from "@/shared/api/client";
import { type Order } from "@/modules/orders/orders.types";
import { type Customer } from "@/modules/customers/customers.types";

export default function OrdersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'PAST'>('ACTIVE');

  const { data: orders, error: ordersError, isLoading: isLoadingOrders } = useSWR<Order[]>("/api/orders", fetcher);
  const { data: customers, error: customersError, isLoading: isLoadingCustomers } = useSWR<Customer[]>("/api/customers", fetcher);

  const isLoading = isLoadingOrders || isLoadingCustomers;
  const error = ordersError || customersError;

  const formatCurrency = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN')}`;

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    
    let filtered = orders;

    // Filter by tab
    if (activeTab === 'ACTIVE') {
      filtered = filtered.filter(o => ['PENDING', 'IN_PROGRESS', 'IN_TRANSIT'].includes(o.status));
    } else {
      filtered = filtered.filter(o => ['DELIVERED', 'CANCELLED'].includes(o.status));
    }

    // Filter by search query (order number or customer name)
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(o => {
        const customerName = customers?.find(c => c.id === o.customerId)?.name || "Unknown Customer";
        return o.orderNumber.toLowerCase().includes(q) || customerName.toLowerCase().includes(q);
      });
    }

    // Sort: Active by delivery date ascending (nearest first), Past by delivery date descending (most recent first)
    return filtered.sort((a, b) => {
      const dateA = new Date(a.delivery.date).getTime();
      const dateB = new Date(b.delivery.date).getTime();
      return activeTab === 'ACTIVE' ? dateA - dateB : dateB - dateA;
    });
  }, [orders, activeTab, searchQuery, customers]);

  const getCustomerName = (customerId: string) => {
    if (!customers) return "Unknown Customer";
    return customers.find(c => c.id === customerId)?.name || "Unknown Customer";
  };

  return (
    <AppShell>
      <div className="space-y-6 lg:space-y-8 animate-fade-in-up pb-24 md:pb-8">
        
        {/* Header & Actions */}
        <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold font-heading text-text tracking-tight flex items-center gap-2">
              <ShoppingBag size={28} className="text-primary" strokeWidth={2.5} />
              Orders
            </h2>
            <p className="text-sm text-text-muted mt-1 font-medium">
              Manage your bakery orders
            </p>
          </div>
          <Link
            href="/orders/new"
            className="touch-target flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-text font-bold text-sm hover:bg-primary-hover active:scale-[0.98] transition-all shadow-md shrink-0"
          >
            <Plus size={18} strokeWidth={3} /> Create Order
          </Link>
        </section>

        {/* Tabs & Search */}
        <section className="space-y-4">
          <div className="flex bg-surface p-1 rounded-xl border border-border shadow-sm">
            <button
              onClick={() => setActiveTab('ACTIVE')}
              className={`flex-1 text-sm font-bold py-2 rounded-lg transition-all ${
                activeTab === 'ACTIVE' ? 'bg-primary text-primary-text shadow-sm' : 'text-text-muted hover:text-text'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setActiveTab('PAST')}
              className={`flex-1 text-sm font-bold py-2 rounded-lg transition-all ${
                activeTab === 'PAST' ? 'bg-background text-text shadow-sm border border-border' : 'text-text-muted hover:text-text'
              }`}
            >
              Past
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search size={18} className="text-text-muted/60" strokeWidth={2.5} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-surface border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm font-medium placeholder:text-text-muted/60 shadow-sm"
              placeholder="Search by order # or customer name..."
            />
          </div>
        </section>

        {/* State Handling & List */}
        <section>
          {error && (
            <div className="p-4 rounded-xl bg-danger-bg text-danger border border-danger/20 text-sm font-medium">
              Failed to load orders. Please try again.
            </div>
          )}

          {isLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-28 bg-surface border border-border rounded-2xl animate-pulse" />
              ))}
            </div>
          )}

          {!isLoading && orders?.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-16 h-16 bg-surface border border-border rounded-full flex items-center justify-center mb-4">
                <ShoppingBag size={32} className="text-text-muted/40" strokeWidth={2} />
              </div>
              <h3 className="text-lg font-bold font-heading text-text mb-1">No orders yet</h3>
              <p className="text-sm text-text-muted max-w-sm mb-6">
                When you receive an order, create it here to track inventory and revenue.
              </p>
              <Link
                href="/orders/new"
                className="touch-target flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary/10 text-primary font-bold text-sm hover:bg-primary/20 active:scale-[0.98] transition-all"
              >
                <Plus size={18} strokeWidth={3} /> Create First Order
              </Link>
            </div>
          )}

          {!isLoading && orders && orders.length > 0 && filteredOrders.length === 0 && (
            <div className="text-center py-10">
              <p className="text-sm text-text-muted font-medium">No {activeTab.toLowerCase()} orders found.</p>
            </div>
          )}

          {filteredOrders.length > 0 && (
            <ul className="space-y-3" role="list">
              {filteredOrders.map(order => {
                // Determine styling based on status
                const isOverdue = activeTab === 'ACTIVE' && new Date(order.delivery.date).getTime() < new Date().getTime();
                
                let statusColor = 'bg-surface border-border';
                let statusBadge = 'bg-text-muted/10 text-text-muted';
                
                if (order.status === 'PENDING') statusBadge = 'bg-warning/15 text-warning';
                if (order.status === 'IN_PROGRESS') statusBadge = 'bg-primary/10 text-primary border-primary/20 border';
                if (order.status === 'IN_TRANSIT') statusBadge = 'bg-secondary/15 text-secondary';
                if (order.status === 'DELIVERED') statusBadge = 'bg-success/15 text-success';
                if (order.status === 'CANCELLED') statusBadge = 'bg-danger/10 text-danger';

                if (isOverdue) statusColor = 'bg-danger-bg/50 border-danger/30';

                return (
                  <li key={order.id}>
                    <Link href={`/orders/${order.id}`}>
                      <article className={`p-4 rounded-2xl border shadow-sm hover:shadow-md active:scale-[0.99] transition-all group ${statusColor}`}>
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <span className="font-bold text-sm text-text group-hover:text-primary transition-colors block leading-none mb-1">
                              {order.orderNumber} • {getCustomerName(order.customerId)}
                            </span>
                            <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${isOverdue ? 'text-danger' : 'text-text-muted'}`}>
                              <Clock size={10} strokeWidth={3} /> 
                              {isOverdue ? 'Overdue' : 'Due'}: {new Date(order.delivery.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                            </span>
                          </div>
                          
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${statusBadge}`}>
                            {order.status.replace('_', ' ')}
                          </span>
                        </div>
                        
                        <div className="flex items-end justify-between pt-3 border-t border-border/50">
                          <div>
                            <span className="text-xs text-text-muted font-medium block mb-0.5">
                              {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                            </span>
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${order.payment.status === 'PAID' ? 'text-success' : 'text-warning'}`}>
                              {order.payment.status === 'PAID' ? 'PAID' : 'UNPAID'}
                            </span>
                          </div>
                          
                          <span className="font-bold font-heading text-lg text-text">
                            {formatCurrency(order.pricing.total)}
                          </span>
                        </div>
                      </article>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}
