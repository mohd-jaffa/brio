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
import { ReceiptPrintView } from "@/features/orders/components/ReceiptPrintView";
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
        <div className="animate-pulse space-y-6">
          <div className="h-32 bg-surface rounded-2xl" />
          <div className="h-48 bg-surface rounded-2xl" />
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
              className="touch-target flex items-center gap-2 text-text-muted hover:text-text transition-colors font-bold text-sm bg-surface p-2 pr-4 rounded-full border border-border shadow-sm active:scale-95"
            >
              <ArrowLeft size={18} strokeWidth={2.5} /> Back
            </button>
            
            <button 
              onClick={() => setShowReceipt(true)}
              className="touch-target flex items-center gap-2 text-primary hover:bg-primary/10 transition-colors font-bold text-sm bg-surface p-2 pr-4 rounded-full border border-primary/20 shadow-sm active:scale-95"
            >
              <Printer size={16} strokeWidth={2.5} /> Generate Receipt
            </button>
          </div>

          {/* Hero Card */}
          <section className="p-5 sm:p-6 rounded-3xl bg-surface border border-border shadow-card relative overflow-hidden">
            <div className={`absolute top-0 inset-x-0 h-2 ${
              order.status === 'DELIVERED' ? 'bg-success' : 
              order.status === 'CANCELLED' ? 'bg-danger' : 
              isOverdue ? 'bg-danger' : 'bg-primary'
            }`} />
            
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mt-2">
              <div>
                <span className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1 block">
                  Order {order.orderNumber}
                </span>
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
            </div>
          </section>

          {/* Quick Status Update */}
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-surface border border-border shadow-card flex flex-col justify-between">
              <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-2 mb-3">
                <ShoppingBag size={14} className="text-primary" /> Order Status
              </h3>
              <select
                value={order.status}
                onChange={(e) => handleUpdateStatus(e.target.value)}
                disabled={isUpdatingStatus}
                className="w-full px-4 py-2.5 rounded-lg bg-background border border-border focus:border-primary outline-none text-sm font-bold"
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
                  value={order.payment.status}
                  onChange={(e) => handleUpdatePayment(e.target.value)}
                  disabled={isUpdatingPayment}
                  className="w-full px-4 py-2.5 rounded-lg bg-background border border-border focus:border-primary outline-none text-sm font-bold"
                >
                  <option value="UNPAID">Unpaid</option>
                  <option value="PARTIALLY_PAID">Partially Paid</option>
                  <option value="PAID">Paid</option>
                </select>
                
                {order.payment.status !== 'PAID' && (
                  <button 
                    onClick={() => setShowPaymentModal(true)}
                    className="w-full py-2 bg-primary/10 text-primary font-bold rounded-lg text-sm hover:bg-primary/20 transition-colors"
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

            {order.notes && (
              <div className="p-5 rounded-2xl bg-surface border border-border shadow-card">
                <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-2 mb-3">
                  Notes
                </h3>
                <p className="text-sm font-medium text-text leading-relaxed">
                  {order.notes}
                </p>
              </div>
            )}
          </section>

          {/* Line Items */}
          <section className="p-5 rounded-2xl bg-surface border border-border shadow-card">
             <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-2 mb-4">
              <ShoppingBag size={14} className="text-primary" /> Order Items
            </h3>
            
            <ul className="space-y-3">
              {order.items.map(item => (
                <li key={item.id} className="flex justify-between items-start pb-3 border-b border-border/50 last:border-0 last:pb-0">
                  <div>
                    <span className="text-sm font-bold text-text block mb-0.5">
                      {item.quantity}x {item.productName}
                    </span>
                    {item.notes && (
                      <span className="text-xs text-text-muted italic block">
                        {item.notes}
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-bold font-heading">
                    {formatCurrency(item.subtotal)}
                  </span>
                </li>
              ))}
            </ul>

            {/* Adjustments */}
            {order.adjustments.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border/50 space-y-2">
                {order.adjustments.map(adj => (
                  <div key={adj.id} className="flex justify-between items-center text-sm">
                    <span className="text-text-muted font-medium">{adj.name}</span>
                    <span className={`font-bold font-heading ${adj.type === 'DISCOUNT' ? 'text-danger' : 'text-text'}`}>
                      {adj.type === 'DISCOUNT' ? '-' : '+'}{formatCurrency(adj.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Totals Summary */}
            <div className="mt-4 pt-4 border-t border-border space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-text-muted font-medium">Subtotal</span>
                <span className="font-bold font-heading text-text">{formatCurrency(order.pricing.subtotal)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-text-muted font-medium">Tax</span>
                <span className="font-bold font-heading text-text">{formatCurrency(order.pricing.tax)}</span>
              </div>
              <div className="flex justify-between items-center text-lg mt-2">
                <span className="font-bold text-text">Total</span>
                <span className="font-bold font-heading text-text">{formatCurrency(order.pricing.total)}</span>
              </div>
            </div>
          </section>

        </div>
      </AppShell>
      
      {showReceipt && (
        <ReceiptPrintView 
          order={order} 
          customer={customer} 
          onClose={() => setShowReceipt(false)} 
        />
      )}
    </>
  );
}
