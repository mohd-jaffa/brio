"use client";

import React, { useState, useMemo } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/shared/components/AppShell";
import { fetcher } from "@/shared/api/client";
import { type Customer } from "@/features/customers/types";
import { type Order } from "@/features/orders/types";
import { CustomerFormSheet } from "@/features/customers/components/CustomerFormSheet";
import { 
  ArrowLeft, 
  Phone, 
  MapPin, 
  Mail, 
  ShoppingBag, 
  CreditCard, 
  TrendingUp, 
  Clock, 
  Edit2, 
  FileText 
} from "lucide-react";

interface CustomerProfileClientProps {
  id: string;
}

export function CustomerProfileClient({ id }: CustomerProfileClientProps) {
  const router = useRouter();
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Fetch Customer
  const { data: customer, error: customerError, mutate: mutateCustomer } = useSWR<Customer>(`/api/customers/${id}`, fetcher);
  
  // Fetch Orders to calculate metrics
  const { data: orders, error: ordersError } = useSWR<Order[]>("/api/orders", fetcher);
  
  const customerOrders = useMemo(() => {
    if (!orders) return [];
    return orders.filter(o => o.customerId === id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, id]);

  const metrics = useMemo(() => {
    if (!customerOrders.length) return { totalOrders: 0, totalSpent: 0, pendingPayments: 0, avgOrder: 0 };
    
    let totalSpent = 0;
    let pendingPayments = 0;
    
    customerOrders.forEach(order => {
      // Only count non-cancelled for total spent
      if (order.status !== 'CANCELLED') {
        totalSpent += order.pricing.total;
        if (order.payment.status !== 'PAID') {
          // Simplified pending calc (total - what's paid), but assuming UNPAID means full total for now
          pendingPayments += order.pricing.total; // To be accurate, we need partial payments, but UNPAID is enough for MVP
        }
      }
    });

    return {
      totalOrders: customerOrders.filter(o => o.status !== 'CANCELLED').length,
      totalSpent,
      pendingPayments,
      avgOrder: totalSpent / (customerOrders.filter(o => o.status !== 'CANCELLED').length || 1),
    };
  }, [customerOrders]);

  if (customerError) {
    return (
      <AppShell>
        <div className="p-6 text-center">
          <p className="text-danger font-medium mb-4">Customer not found.</p>
          <button onClick={() => router.back()} className="text-primary font-bold">Go Back</button>
        </div>
      </AppShell>
    );
  }

  if (!customer) {
    return (
      <AppShell>
        <div className="animate-pulse space-y-6">
          <div className="h-32 bg-surface rounded-2xl" />
          <div className="h-48 bg-surface rounded-2xl" />
        </div>
      </AppShell>
    );
  }

  const formatCurrency = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN')}`;

  return (
    <AppShell>
      <div className="space-y-6 lg:space-y-8 animate-fade-in-up pb-24 md:pb-8">
        
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <button 
            onClick={() => router.back()}
            className="touch-target flex items-center gap-2 text-text-muted hover:text-text transition-colors font-bold text-sm bg-surface p-2 pr-4 rounded-full border border-border shadow-sm active:scale-95"
          >
            <ArrowLeft size={18} strokeWidth={2.5} /> Back
          </button>
          
          <button 
            onClick={() => setIsFormOpen(true)}
            className="touch-target flex items-center gap-2 text-primary hover:bg-primary/10 transition-colors font-bold text-sm bg-surface p-2 pr-4 rounded-full border border-primary/20 shadow-sm active:scale-95"
          >
            <Edit2 size={16} strokeWidth={2.5} /> Edit
          </button>
        </div>

        {/* Hero Card */}
        <section className="p-6 rounded-3xl bg-surface border border-border shadow-card flex flex-col items-center text-center relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-primary/10 to-transparent" />
          
          <div className="w-20 h-20 rounded-full bg-primary/15 text-primary font-bold font-heading text-3xl flex items-center justify-center border-4 border-background mb-4 z-10 shadow-sm">
            {customer.name.charAt(0).toUpperCase()}
          </div>
          
          <h1 className="text-2xl font-bold font-heading text-text mb-1 z-10">{customer.name}</h1>
          
          <div className="flex items-center gap-2 text-text-muted font-medium text-sm mb-6 z-10">
            <Phone size={14} /> {customer.phone}
          </div>

          <div className="flex gap-3 w-full">
            <a 
              href={`tel:${customer.phone}`}
              className="touch-target flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-text font-bold text-sm shadow-md active:scale-[0.98] transition-all"
            >
              <Phone size={16} strokeWidth={2.5} /> Call
            </a>
            {customer.googleMapsLink && (
              <a 
                href={customer.googleMapsLink}
                target="_blank"
                rel="noopener noreferrer"
                className="touch-target flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-background border border-border text-text font-bold text-sm shadow-sm hover:bg-surface-hover active:scale-[0.98] transition-all"
              >
                <MapPin size={16} strokeWidth={2.5} /> Directions
              </a>
            )}
          </div>
        </section>

        {/* Business Analytics Card */}
        <section className="p-5 rounded-2xl bg-surface border border-border shadow-card">
          <h3 className="text-sm font-bold font-heading mb-4 text-text flex items-center gap-2">
            <TrendingUp size={18} className="text-secondary" strokeWidth={2.5} />
            Customer Analytics
          </h3>
          <dl className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-background border border-border flex flex-col justify-between">
              <dt className="text-[10px] text-text-muted font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <ShoppingBag size={12} strokeWidth={2.5} /> Total Orders
              </dt>
              <dd className="text-2xl font-bold font-heading text-text">{metrics.totalOrders}</dd>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-success/10 to-success/5 border border-success/20 flex flex-col justify-between">
              <dt className="text-[10px] text-success font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <CreditCard size={12} strokeWidth={2.5} /> Total Spent
              </dt>
              <dd className="text-2xl font-bold font-heading text-success">{formatCurrency(metrics.totalSpent)}</dd>
            </div>
            <div className="p-4 rounded-xl bg-background border border-border flex flex-col justify-between">
              <dt className="text-[10px] text-text-muted font-bold uppercase tracking-wider mb-2">Avg Order</dt>
              <dd className="text-xl font-bold font-heading text-text">{formatCurrency(metrics.avgOrder)}</dd>
            </div>
            <div className="p-4 rounded-xl bg-danger-bg/50 border border-danger/20 flex flex-col justify-between">
              <dt className="text-[10px] text-danger font-bold uppercase tracking-wider mb-2">Pending</dt>
              <dd className="text-xl font-bold font-heading text-danger">{formatCurrency(metrics.pendingPayments)}</dd>
            </div>
          </dl>
        </section>

        {/* Details & Notes */}
        {(customer.email || customer.address || customer.notes) && (
          <section className="p-5 rounded-2xl bg-surface border border-border shadow-card">
             <h3 className="text-sm font-bold font-heading mb-4 text-text flex items-center gap-2">
              <FileText size={18} className="text-primary" strokeWidth={2.5} />
              Details
            </h3>
            <ul className="space-y-4">
              {customer.email && (
                <li className="flex items-start gap-3">
                  <Mail size={16} className="text-text-muted shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block mb-0.5">Email</span>
                    <span className="text-sm font-medium">{customer.email}</span>
                  </div>
                </li>
              )}
              {customer.address && (
                <li className="flex items-start gap-3">
                  <MapPin size={16} className="text-text-muted shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block mb-0.5">Address</span>
                    <span className="text-sm font-medium leading-relaxed">{customer.address}</span>
                  </div>
                </li>
              )}
              {customer.notes && (
                <li className="flex items-start gap-3">
                  <FileText size={16} className="text-warning shrink-0 mt-0.5" />
                  <div className="w-full">
                    <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block mb-0.5">Baker Notes</span>
                    <div className="bg-warning/10 border border-warning/20 p-3 rounded-xl mt-1">
                      <span className="text-sm font-medium text-warning-text leading-relaxed">{customer.notes}</span>
                    </div>
                  </div>
                </li>
              )}
            </ul>
          </section>
        )}

        {/* Recent Orders */}
        <section>
           <h3 className="text-sm font-bold font-heading mb-4 text-text flex items-center gap-2">
            <Clock size={18} className="text-primary" strokeWidth={2.5} />
            Recent Orders
          </h3>
          
          {ordersError && (
             <div className="p-4 rounded-xl bg-danger-bg text-danger text-sm font-medium border border-danger/20">
               Could not load orders.
             </div>
          )}

          {!orders && !ordersError && (
            <div className="space-y-3">
              {[1, 2].map(i => <div key={i} className="h-16 bg-surface border border-border rounded-2xl animate-pulse" />)}
            </div>
          )}

          {customerOrders.length === 0 && (
            <div className="p-6 text-center bg-surface border border-border rounded-2xl border-dashed">
              <p className="text-sm text-text-muted font-medium">No orders found for this customer.</p>
            </div>
          )}

          {customerOrders.length > 0 && (
            <ul className="space-y-3">
              {customerOrders.slice(0, 5).map(order => (
                <li key={order.id}>
                  <Link href={`/orders/${order.id}`}>
                    <article className="flex items-center justify-between p-4 rounded-2xl bg-surface border border-border shadow-sm hover:bg-surface-hover hover:shadow-md active:scale-[0.99] transition-all group">
                      <div>
                        <span className="font-bold text-sm block group-hover:text-primary transition-colors">
                          {order.orderNumber}
                        </span>
                        <span className="text-xs text-text-muted font-medium mt-0.5 block">
                          {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-sm block mb-1">{formatCurrency(order.pricing.total)}</span>
                        <span className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded ${
                          order.status === 'DELIVERED' ? 'bg-success/10 text-success' : 
                          order.status === 'CANCELLED' ? 'bg-danger/10 text-danger' : 
                          'bg-warning/15 text-warning'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                    </article>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

      </div>
      
      <CustomerFormSheet 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
        onSuccess={() => mutateCustomer()} 
        initialData={customer}
      />
    </AppShell>
  );
}
