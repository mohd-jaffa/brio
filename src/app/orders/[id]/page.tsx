"use client";

import React, { useState } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { AppShell } from "@/shared/components/AppShell";
import { 
  ArrowLeft, 
  ShoppingBag, 
  MapPin, 
  CreditCard, 
  Clock, 
  Phone,
  Printer
} from "lucide-react";
import { fetcher } from "@/shared/api/client";
import { type Order } from "@/features/orders/types";
import { type Customer } from "@/features/customers/types";
import { type ReceiptData } from "@/features/receipts/types";
import { ReceiptPrintView } from "@/features/receipts/components/ReceiptPrintView";
import { PaymentCollectionForm } from "@/features/payments/components/PaymentCollectionForm";
import { OrdersClient } from "@/features/orders/api.client";
import { getErrorMessage, ERROR_MESSAGES } from "@/constants/messages";

export default function OrderDetailsPage({ params }: { params: { id: string } }) {
  // We handle params asynchronously/synchronously depending on Next15, but typical React hook:
  const router = useRouter();
  // Safe unwrapping for Next 15 (if required, though for now we can just use params.id directly in standard Next.js 14, in Next 15 it's a promise, but in Next 14/13 it's an object).
  // I'll just use params.id.
  const id = params.id; 

  const { data: order, error: orderError, mutate: mutateOrder } = useSWR<Order>(`/api/orders/${id}`, fetcher);
  const { data: customer } = useSWR<Customer>(order ? `/api/customers/${order.customerId}` : null, fetcher);
  const { data: payments, mutate: mutatePayments } = useSWR<any[]>(`/api/orders/${id}/payments`, fetcher);

  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Conditionally fetch receipt data only when the modal is opened
  const { data: receiptData } = useSWR<ReceiptData>(
    showReceipt ? `/api/orders/${id}/receipt` : null, 
    fetcher
  );

  const formatCurrency = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN')}`;

  const handleUpdateStatus = async (newStatus: string) => {
    setIsUpdatingStatus(true);
    try {
      await OrdersClient.updateStatus(id, { status: newStatus as any });
      mutateOrder();
    } catch (err) {
      console.error(err);
      alert(getErrorMessage(ERROR_MESSAGES.EXTERNAL_SERVICE_ERROR));
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleUpdatePayment = async (newPaymentStatus: string) => {
    setIsUpdatingPayment(true);
    try {
      await OrdersClient.updateStatus(id, { paymentStatus: newPaymentStatus as any });
      mutateOrder();
    } catch (err) {
      console.error(err);
      alert(getErrorMessage(ERROR_MESSAGES.EXTERNAL_SERVICE_ERROR));
    } finally {
      setIsUpdatingPayment(false);
    }
  };

  if (orderError) {
    return (
      <AppShell>
        <div className="p-6 text-center">
          <p className="text-danger font-medium mb-4">Order not found.</p>
          <button onClick={() => router.back()} className="text-primary font-bold">Go Back</button>
        </div>
      </AppShell>
    );
  }

  if (!order) {
    return (
      <AppShell>
        <div className="animate-pulse space-y-6" role="status" aria-busy="true" aria-label="Loading order details">
          <div className="h-32 bg-surface rounded-3xl border border-border" />
          <div className="h-48 bg-surface rounded-3xl border border-border" />
        </div>
      </AppShell>
    );
  }

  const isOverdue = new Date(order.delivery.date).getTime() < new Date().getTime() && !['DELIVERED', 'CANCELLED'].includes(order.status);

  return (
    <>
      <AppShell>
        <div className="space-y-6 lg:space-y-8 animate-fade-in-up pb-24 md:pb-8 max-w-3xl mx-auto">
          
          {/* Navigation & Actions */}
          <div className="flex items-center justify-between">
            <button 
              onClick={() => router.back()}
              aria-label="Go back"
              className="touch-target flex items-center gap-2 text-text-muted hover:text-text transition-all duration-200 font-bold text-sm bg-surface p-2 pr-4 rounded-full border border-border shadow-sm active:scale-95 hover:shadow-md"
            >
              <ArrowLeft size={18} strokeWidth={2.5} /> Back
            </button>
            
            <button 
              onClick={() => setShowReceipt(true)}
              aria-label="Generate Receipt"
              className="touch-target flex items-center gap-2 text-primary hover:bg-primary/10 transition-all duration-200 font-bold text-sm bg-surface p-2 pr-4 rounded-full border border-primary/20 shadow-sm active:scale-95 hover:shadow-md"
            >
              <Printer size={16} strokeWidth={2.5} /> Generate Receipt
            </button>
          </div>

          {/* Hero Card */}
          <section className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-surface to-surface-hover border border-border shadow-elevated relative overflow-hidden flex flex-col sm:flex-row sm:items-start justify-between gap-6">
            
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
                  Order {order.orderNumber}
                </span>
                <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${
                  order.status === 'DELIVERED' ? 'bg-success/10 text-success' : 
                  order.status === 'CANCELLED' ? 'bg-danger/10 text-danger' : 
                  isOverdue ? 'bg-danger/10 text-danger' : 'bg-primary/10 text-primary'
                }`}>
                  {isOverdue && !['DELIVERED', 'CANCELLED'].includes(order.status) ? 'OVERDUE' : order.status.replace('_', ' ')}
                </span>
              </div>
                <h1 className="text-2xl font-bold font-heading text-text mb-2">
                  {customer ? customer.name : "Loading Customer..."}
                </h1>
                {customer && (
                  <div className="flex items-center gap-2 text-sm font-medium text-text-muted">
                    <Phone size={14} /> {customer.phone}
                  </div>
                )}
              </div>

              <div className="text-left sm:text-right">
                <span className="text-3xl font-bold font-heading text-text block mb-1">
                  {formatCurrency(order.pricing.total)}
                </span>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded inline-block ${
                  order.payment.status === 'PAID' ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'
                }`}>
                  {order.payment.status.replace('_', ' ')}
                </span>
              </div>
          </section>

          {/* Quick Status Update */}
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-surface border border-border shadow-card flex flex-col justify-between">
              <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-2 mb-3">
                <ShoppingBag size={14} className="text-primary" /> Order Status
              </h3>
              <select
                aria-label="Order Status"
                value={order.status}
                onChange={(e) => handleUpdateStatus(e.target.value)}
                disabled={isUpdatingStatus}
                className="w-full px-4 py-2.5 rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none text-sm font-bold transition-all duration-200 cursor-pointer disabled:opacity-50"
              >
                <option value="PENDING">Pending</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="IN_TRANSIT">In Transit</option>
                <option value="DELIVERED">Delivered</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div className="p-5 rounded-2xl bg-surface border border-border shadow-card flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-2">
                  <CreditCard size={14} className="text-success" /> Payment Status
                </h3>
              </div>
              <div className="space-y-3">
                <select
                  aria-label="Payment Status"
                  value={order.payment.status}
                  onChange={(e) => handleUpdatePayment(e.target.value)}
                  disabled={isUpdatingPayment}
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none text-sm font-bold transition-all duration-200 cursor-pointer disabled:opacity-50"
                >
                  <option value="UNPAID">Unpaid</option>
                  <option value="PARTIALLY_PAID">Partially Paid</option>
                  <option value="PAID">Paid</option>
                </select>
                
                {order.payment.status !== 'PAID' && (
                  <button 
                    onClick={() => setShowPaymentModal(true)}
                    className="w-full py-2.5 bg-primary/10 text-primary font-bold rounded-xl text-sm hover:bg-primary/20 active:scale-95 transition-all duration-200"
                  >
                    Collect Payment
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Delivery & Notes */}
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-surface border border-border shadow-card">
              <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-2 mb-3">
                <Clock size={14} className={isOverdue ? 'text-danger' : 'text-primary'} /> Delivery Details
              </h3>
              <div className="space-y-3">
                <div>
                  <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block mb-0.5">Type & Time</span>
                  <span className={`text-sm font-medium block ${isOverdue ? 'text-danger font-bold' : 'text-text'}`}>
                    {order.delivery.type} on {new Date(order.delivery.date).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                  </span>
                </div>
                {order.delivery.address && (
                  <div>
                    <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block mb-0.5">Address</span>
                    <span className="text-sm font-medium text-text leading-relaxed block">{order.delivery.address}</span>
                  </div>
                )}
                {order.delivery.googleMapsLink && (
                  <a href={order.delivery.googleMapsLink} target="_blank" rel="noopener noreferrer" className="text-primary text-sm font-bold flex items-center gap-1 mt-2 hover:underline">
                    <MapPin size={14} /> Open in Maps
                  </a>
                )}
              </div>
            </div>

            {order.notes ? (
              <div className="p-5 rounded-2xl bg-surface border border-border shadow-card h-full flex flex-col">
                <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-2 mb-3">
                  Notes
                </h3>
                <p className="text-sm font-medium text-text leading-relaxed p-3 bg-background rounded-xl border border-border/50 flex-grow">
                  {order.notes}
                </p>
              </div>
            ) : (
              <div className="p-5 rounded-2xl bg-surface border border-border border-dashed shadow-sm h-full flex flex-col items-center justify-center opacity-60">
                <p className="text-sm font-medium text-text-muted">
                  No special instructions provided.
                </p>
              </div>
            )}
          </section>

          {/* Line Items */}
          <section className="p-1 rounded-3xl bg-surface border border-border shadow-card overflow-hidden">
             <div className="p-5 pb-2">
               <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-2">
                 <ShoppingBag size={14} className="text-primary" /> Order Items
               </h3>
             </div>
            
            <div className="px-5 py-2">
              {order.items.map(item => (
                <div key={item.id} className="grid grid-cols-[3fr_1fr_2fr] gap-4 items-center py-3 border-b border-border/50 border-dashed last:border-0 last:pb-4">
                  <div className="text-sm font-bold text-text truncate">
                    {item.productName}
                  </div>
                  <div className="text-sm font-medium text-text-muted tabular-nums">
                    x{item.quantity}
                  </div>
                  <div className="text-sm font-bold font-heading text-text text-right tabular-nums">
                    {formatCurrency(item.subtotal)}
                  </div>
                </div>
              ))}
            </div>

            {/* Pricing Summary (Elevated Footer within the Card) */}
            <div className="bg-background p-5 border-t border-border mt-2">
              <div className="flex justify-between items-center text-sm mb-3">
                <span className="text-text-muted font-medium">Subtotal</span>
                <span className="font-bold font-heading text-text tabular-nums">{formatCurrency(order.pricing.subtotal)}</span>
              </div>
              
              {order.adjustments.map(adj => (
                <div key={adj.id} className="flex justify-between items-center text-sm mb-3">
                  <span className="text-text-muted font-medium flex items-center gap-1">
                    {adj.name}
                  </span>
                  <span className={`font-bold tabular-nums ${adj.type === 'DISCOUNT' ? 'text-success' : 'text-text'}`}>
                    {adj.type === 'DISCOUNT' ? '-' : '+'}{formatCurrency(adj.amount)}
                  </span>
                </div>
              ))}

              <div className="flex justify-between items-center text-sm mb-4">
                <span className="text-text-muted font-medium">Tax</span>
                <span className="font-bold font-heading text-text tabular-nums">{formatCurrency(order.pricing.tax)}</span>
              </div>
              
              <div className="flex justify-between items-center text-xl mt-4 pt-4 border-t border-border/50">
                <span className="font-bold text-text uppercase text-sm tracking-wider">Total</span>
                <span className="font-bold font-heading text-text tabular-nums bg-primary/5 px-3 py-1 rounded-lg border border-primary/10">{formatCurrency(order.pricing.total)}</span>
              </div>
            </div>
          </section>

        </div>
      </AppShell>
      
      {/* Receipt Modal */}
      {showReceipt && receiptData && (
        <ReceiptPrintView 
          receipt={receiptData} 
          customerName={customer?.name}
          customerPhone={customer?.phone}
          onClose={() => setShowReceipt(false)} 
        />
      )}
    </>
  );
}
