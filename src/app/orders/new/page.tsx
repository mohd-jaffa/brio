"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import useSWR from "swr";
import { AppShell } from "@/shared/components/AppShell";
import { ArrowLeft, Loader2, Plus, Trash2, ShoppingBag, Truck, User, CreditCard } from "lucide-react";
import { fetcher } from "@/shared/api/client";
import { type Customer } from "@/features/customers/types";
import { type Product } from "@/features/products/types";
import { OrdersClient } from "@/features/orders/api.client";
import { getErrorMessage, ERROR_MESSAGES } from "@/constants/messages";

// Client-side schema allowing price input in Rupees for adjustments and parsing ISO date string
const orderFormSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  items: z.array(z.object({
    productId: z.string().min(1, "Product is required"),
    quantity: z.number().int().min(1, "Quantity must be at least 1"),
    notes: z.string().optional(),
  })).min(1, "Order must have at least one item"),
  adjustments: z.array(z.object({
    type: z.enum(["DISCOUNT", "CHARGE"]),
    name: z.string().min(1, "Name is required"),
    amountRupees: z.number().min(0, "Amount cannot be negative"),
  })),
  delivery: z.object({
    type: z.enum(["DELIVERY", "PICKUP"]),
    date: z.string().min(1, "Date and time are required"),
    address: z.string().optional(),
    googleMapsLink: z.string().optional(),
  }),
  payment: z.object({
    status: z.enum(["UNPAID", "PAID", "PARTIALLY_PAID"]),
    method: z.enum(["CASH", "UPI", "BANK_TRANSFER", "CARD", "OTHER"]).optional(),
    reference: z.string().optional(),
  }),
  notes: z.string().optional(),
});

type OrderFormValues = z.infer<typeof orderFormSchema>;

export default function NewOrderPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: customers } = useSWR<Customer[]>("/api/customers", fetcher);
  const { data: products } = useSWR<Product[]>("/api/products", fetcher);

  const activeProducts = useMemo(() => products?.filter(p => p.isActive) || [], [products]);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      customerId: "",
      items: [{ productId: "", quantity: 1, notes: "" }],
      adjustments: [],
      delivery: {
        type: "PICKUP",
        date: new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16), // Tomorrow
        address: "",
        googleMapsLink: "",
      },
      payment: {
        status: "UNPAID",
        method: "CASH",
        reference: "",
      },
      notes: "",
    },
  });

  const { fields: itemFields, append: appendItem, remove: removeItem } = useFieldArray({
    control,
    name: "items",
  });

  const { fields: adjFields, append: appendAdj, remove: removeAdj } = useFieldArray({
    control,
    name: "adjustments",
  });

  // Watch for real-time calculations
  const watchedItems = watch("items");
  const watchedAdjustments = watch("adjustments");

  const totals = useMemo(() => {
    let subtotalPaise = 0;
    
    watchedItems.forEach(item => {
      if (item.productId && item.quantity > 0) {
        const product = activeProducts.find(p => p.id === item.productId);
        if (product) {
          subtotalPaise += product.defaultPrice * item.quantity;
        }
      }
    });

    let discountPaise = 0;
    let chargesPaise = 0;

    watchedAdjustments.forEach(adj => {
      const amt = Math.round((adj.amountRupees || 0) * 100);
      if (adj.type === 'DISCOUNT') discountPaise += amt;
      else chargesPaise += amt;
    });

    const totalPaise = subtotalPaise - discountPaise + chargesPaise;

    return { subtotalPaise, discountPaise, chargesPaise, totalPaise };
  }, [watchedItems, watchedAdjustments, activeProducts]);

  const formatCurrency = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN')}`;

  const onSubmit = async (data: OrderFormValues) => {
    setIsSubmitting(true);
    setError(null);

    // Transform payload
    const payload = {
      customerId: data.customerId,
      items: data.items.map(i => ({
        productId: i.productId,
        quantity: i.quantity,
        notes: i.notes || undefined,
      })),
      adjustments: data.adjustments.map(a => ({
        type: a.type,
        name: a.name,
        amount: Math.round(a.amountRupees * 100),
      })),
      delivery: {
        type: data.delivery.type,
        // Convert local datetime-local string to proper ISO string
        date: new Date(data.delivery.date).toISOString(),
        address: data.delivery.address || undefined,
        googleMapsLink: data.delivery.googleMapsLink || undefined,
      },
      payment: {
        status: data.payment.status,
        method: data.payment.method || undefined,
        reference: data.payment.reference || undefined,
      },
      notes: data.notes || undefined,
    };

    try {
      const res = await OrdersClient.createOrder(payload as any);
      // Assuming response contains the created order in res.data (fetcher handles unwrapping now)
      router.push(`/orders/${res.id}`);
    } catch (err) {
      const e = err as Error;
      setError(e.message || getErrorMessage(ERROR_MESSAGES.EXTERNAL_SERVICE_ERROR));
      setIsSubmitting(false); // Only set false if error, otherwise let it navigate
    }
  };

  return (
    <AppShell>
      <div className="space-y-6 lg:space-y-8 animate-fade-in-up pb-32 md:pb-8 max-w-3xl mx-auto">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => router.back()}
            className="touch-target flex items-center gap-2 text-text-muted hover:text-text transition-colors font-bold text-sm bg-surface p-2 pr-4 rounded-full border border-border shadow-sm active:scale-95"
          >
            <ArrowLeft size={18} strokeWidth={2.5} /> Back
          </button>
        </div>

        <section>
          <h2 className="text-2xl sm:text-3xl font-bold font-heading text-text tracking-tight mb-2 flex items-center gap-2">
            <ShoppingBag size={28} className="text-primary" strokeWidth={2.5} />
            Create Order
          </h2>
        </section>

        {error && (
          <div className="p-4 rounded-xl bg-danger-bg text-danger border border-danger/20 text-sm font-medium">
            {error}
          </div>
        )}

        <form id="new-order-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          
          {/* Customer Selection */}
          <div className="p-5 rounded-2xl bg-surface border border-border shadow-card space-y-4">
            <h3 className="text-sm font-bold font-heading text-text flex items-center gap-2">
              <User size={18} className="text-secondary" strokeWidth={2.5} /> Customer Details
            </h3>
            
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                Select Customer <span className="text-danger">*</span>
              </label>
              <select
                {...register("customerId")}
                className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm font-bold"
              >
                <option value="">-- Choose Customer --</option>
                {customers?.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                ))}
              </select>
              {errors.customerId && <p className="text-danger text-xs mt-1.5 font-medium">{errors.customerId.message}</p>}
            </div>
          </div>

          {/* Line Items */}
          <div className="p-5 rounded-2xl bg-surface border border-border shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold font-heading text-text flex items-center gap-2">
                <ShoppingBag size={18} className="text-primary" strokeWidth={2.5} /> Order Items
              </h3>
              <button
                type="button"
                onClick={() => appendItem({ productId: "", quantity: 1, notes: "" })}
                className="touch-target flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-hover transition-colors p-2 rounded-lg hover:bg-primary/10"
              >
                <Plus size={14} strokeWidth={3} /> Add Item
              </button>
            </div>
            
            {errors.items?.root && <p className="text-danger text-xs font-medium">{errors.items.root.message}</p>}

            <div className="space-y-4">
              {itemFields.map((field, index) => (
                <div key={field.id} className="p-4 rounded-xl bg-background border border-border relative group">
                  {itemFields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="absolute -top-2 -right-2 p-1.5 rounded-full bg-danger text-white hover:bg-danger/90 active:scale-95 shadow-sm transition-all"
                    >
                      <Trash2 size={12} strokeWidth={3} />
                    </button>
                  )}
                  
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                    <div className="sm:col-span-8">
                      <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">Product</label>
                      <select
                        {...register(`items.${index}.productId` as const)}
                        className="w-full px-4 py-2.5 rounded-lg bg-surface border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm font-medium"
                      >
                        <option value="">Select a product...</option>
                        {activeProducts.map(p => (
                          <option key={p.id} value={p.id}>{p.name} - {formatCurrency(p.defaultPrice)}/{p.unit}</option>
                        ))}
                      </select>
                      {errors.items?.[index]?.productId && <p className="text-danger text-xs mt-1.5 font-medium">{errors.items[index]?.productId?.message}</p>}
                    </div>
                    
                    <div className="sm:col-span-4">
                      <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">Qty</label>
                      <input
                        type="number"
                        min="1"
                        {...register(`items.${index}.quantity` as const, { valueAsNumber: true })}
                        className="w-full px-4 py-2.5 rounded-lg bg-surface border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm font-bold font-heading"
                      />
                      {errors.items?.[index]?.quantity && <p className="text-danger text-xs mt-1.5 font-medium">{errors.items[index]?.quantity?.message}</p>}
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <input
                      type="text"
                      placeholder="Special instructions or notes for this item..."
                      {...register(`items.${index}.notes` as const)}
                      className="w-full px-4 py-2 rounded-lg bg-surface border border-border focus:border-primary outline-none transition-all text-xs font-medium placeholder:text-text-muted/60"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Adjustments (Discounts & Charges) */}
          <div className="p-5 rounded-2xl bg-surface border border-border shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold font-heading text-text flex items-center gap-2">
                <CreditCard size={18} className="text-warning" strokeWidth={2.5} /> Discounts & Charges
              </h3>
              <button
                type="button"
                onClick={() => appendAdj({ type: "CHARGE", name: "Delivery Fee", amountRupees: 0 })}
                className="touch-target flex items-center gap-1.5 text-xs font-bold text-warning hover:text-warning-text transition-colors p-2 rounded-lg hover:bg-warning/10"
              >
                <Plus size={14} strokeWidth={3} /> Add Adj.
              </button>
            </div>

            {adjFields.length === 0 && (
              <p className="text-xs text-text-muted font-medium italic">No extra charges or discounts applied.</p>
            )}

            <div className="space-y-3">
              {adjFields.map((field, index) => (
                <div key={field.id} className="flex flex-col sm:flex-row gap-3 items-end">
                   <div className="w-full sm:w-1/4">
                      <select
                        {...register(`adjustments.${index}.type` as const)}
                        className="w-full px-3 py-2 rounded-lg bg-background border border-border focus:border-primary outline-none text-xs font-bold"
                      >
                        <option value="CHARGE">Charge (+)</option>
                        <option value="DISCOUNT">Discount (-)</option>
                      </select>
                   </div>
                   <div className="w-full sm:w-1/2">
                     <input
                        type="text"
                        placeholder="e.g. Delivery, Coupon"
                        {...register(`adjustments.${index}.name` as const)}
                        className="w-full px-3 py-2 rounded-lg bg-background border border-border focus:border-primary outline-none text-sm font-medium"
                      />
                   </div>
                   <div className="w-full sm:w-1/4 flex gap-2 items-center">
                     <div className="relative flex-1">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-text-muted font-bold text-sm">₹</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          {...register(`adjustments.${index}.amountRupees` as const, { valueAsNumber: true })}
                          className="w-full pl-7 pr-3 py-2 rounded-lg bg-background border border-border focus:border-primary outline-none text-sm font-bold font-heading"
                        />
                     </div>
                     <button
                        type="button"
                        onClick={() => removeAdj(index)}
                        className="p-2 rounded-lg text-danger hover:bg-danger-bg active:scale-95 transition-all"
                      >
                        <Trash2 size={16} strokeWidth={2.5} />
                      </button>
                   </div>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery Details */}
          <div className="p-5 rounded-2xl bg-surface border border-border shadow-card space-y-4">
            <h3 className="text-sm font-bold font-heading text-text flex items-center gap-2">
              <Truck size={18} className="text-success" strokeWidth={2.5} /> Delivery Details
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">Type</label>
                <select
                  {...register("delivery.type")}
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary outline-none text-sm font-bold"
                >
                  <option value="PICKUP">Pickup</option>
                  <option value="DELIVERY">Delivery</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">Date & Time</label>
                <input
                  type="datetime-local"
                  {...register("delivery.date")}
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary outline-none text-sm font-bold"
                />
              </div>
            </div>
            
            {watch("delivery.type") === "DELIVERY" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">Address</label>
                  <textarea
                    {...register("delivery.address")}
                    className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary outline-none text-sm font-medium min-h-[60px]"
                    placeholder="Delivery address..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">Google Maps Link</label>
                  <input
                    type="url"
                    {...register("delivery.googleMapsLink")}
                    className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary outline-none text-sm font-medium"
                    placeholder="https://maps.google.com/..."
                  />
                </div>
              </div>
            )}
          </div>

          {/* Payment Details */}
          <div className="p-5 rounded-2xl bg-surface border border-border shadow-card space-y-4">
            <h3 className="text-sm font-bold font-heading text-text flex items-center gap-2">
              <CreditCard size={18} className="text-primary" strokeWidth={2.5} /> Payment Status
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">Status</label>
                <select
                  {...register("payment.status")}
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary outline-none text-sm font-bold"
                >
                  <option value="UNPAID">Unpaid</option>
                  <option value="PAID">Paid</option>
                  <option value="PARTIALLY_PAID">Partially Paid</option>
                </select>
              </div>
              
              {watch("payment.status") !== "UNPAID" && (
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">Method</label>
                  <select
                    {...register("payment.method")}
                    className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary outline-none text-sm font-bold"
                  >
                    <option value="UPI">UPI</option>
                    <option value="CASH">Cash</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CARD">Card</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="p-5 rounded-2xl bg-surface border border-border shadow-card space-y-4">
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">Internal Notes</label>
              <textarea
                {...register("notes")}
                className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary outline-none text-sm font-medium min-h-[60px]"
                placeholder="Order notes not visible to customer..."
              />
            </div>
          </div>

        </form>
      </div>

      {/* Floating Bottom Bar for Totals & Submit */}
      <div className="fixed inset-x-0 bottom-0 md:pl-[280px] p-4 bg-surface/80 backdrop-blur-md border-t border-border shadow-elevated safe-bottom z-40">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Total</span>
            <span className="text-xl font-bold font-heading text-text leading-none">{formatCurrency(totals.totalPaise)}</span>
            {(totals.discountPaise > 0 || totals.chargesPaise > 0) && (
              <span className="text-[10px] text-text-muted font-medium mt-0.5">
                Includes adjs
              </span>
            )}
          </div>
          
          <button
            type="submit"
            form="new-order-form"
            disabled={isSubmitting || totals.totalPaise < 0 || watchedItems.length === 0}
            className="touch-target flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-primary text-primary-text font-bold text-base hover:bg-primary-hover active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none shadow-md"
          >
            {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : "Place Order"}
          </button>
        </div>
      </div>
    </AppShell>
  );
}
