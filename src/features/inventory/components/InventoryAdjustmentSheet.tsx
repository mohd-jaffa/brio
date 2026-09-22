"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2 } from "lucide-react";
import { z } from "zod";
import { type Product } from "@/features/products/types";
import { InventoryClient } from "@/features/inventory/api.client";
import { getErrorMessage, ERROR_MESSAGES } from "@/constants/messages";

interface InventoryAdjustmentSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product?: Product;
}

// Client-side schema that enforces specific manual types
const adjustmentSchema = z.object({
  type: z.enum(['STOCK_IN', 'ADJUSTMENT', 'WASTAGE', 'RETURN']),
  quantity: z.number().int("Must be a whole number"),
  referenceType: z.string().optional(),
  referenceId: z.string().optional(),
});

type FormValues = z.infer<typeof adjustmentSchema>;

export function InventoryAdjustmentSheet({ isOpen, onClose, onSuccess, product }: InventoryAdjustmentSheetProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: {
      type: "STOCK_IN",
      quantity: 0,
      referenceType: "MANUAL",
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        type: "STOCK_IN",
        quantity: 0,
        referenceType: "MANUAL",
      });
    }
  }, [isOpen, reset]);

  const onSubmit = async (data: FormValues) => {
    if (!product) return;
    setIsSubmitting(true);
    setError(null);

    // Wastage and Consumption usually decrement stock, meaning they must be negative mathematically.
    // We let the API layer handle the math if they set it up to accept absolute values, but let's check
    // Wait, the API requires exact math for the ledger.
    // If user selects WASTAGE, the quantity should be negative in the DB.
    let finalQuantity = data.quantity;
    if (data.type === 'WASTAGE' && finalQuantity > 0) finalQuantity = -finalQuantity;
    if (data.type === 'STOCK_IN' && finalQuantity < 0) finalQuantity = Math.abs(finalQuantity);
    if (data.type === 'RETURN' && finalQuantity < 0) finalQuantity = Math.abs(finalQuantity);

    try {
      await InventoryClient.adjustStock({
        productId: product.id,
        type: data.type,
        quantity: finalQuantity,
        referenceType: data.referenceType,
        referenceId: data.referenceId,
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      const e = err as Error;
      setError(e.message || getErrorMessage(ERROR_MESSAGES.EXTERNAL_SERVICE_ERROR));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !product) return null;

  return (
    <>
      <div 
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div 
        role="dialog"
        aria-modal="true"
        className="fixed inset-x-0 bottom-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-50 md:w-full md:max-w-md bg-surface border border-border md:rounded-2xl rounded-t-3xl shadow-elevated safe-bottom animate-slide-up max-h-[90vh] flex flex-col"
      >
        <div className="flex justify-center py-3 md:hidden">
          <div className="w-12 h-1.5 rounded-full bg-border" />
        </div>

        <div className="flex items-center justify-between px-6 pb-4 md:pt-6">
          <div>
            <h2 className="text-xl font-bold font-heading text-text">Adjust Stock</h2>
            <p className="text-sm font-medium text-text-muted mt-0.5">{product.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="touch-target text-text-muted hover:text-text hover:bg-surface-hover transition-colors rounded-full flex items-center justify-center p-2 active:scale-95"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        <div className="overflow-y-auto px-6 pb-6">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-danger-bg border border-danger/20 text-danger text-sm font-medium">
              {error}
            </div>
          )}

          <form id="inventory-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                Adjustment Type <span className="text-danger">*</span>
              </label>
              <select
                {...register("type")}
                className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm font-bold"
              >
                <option value="STOCK_IN">Stock In (Add)</option>
                <option value="RETURN">Return (Add)</option>
                <option value="WASTAGE">Wastage (Remove)</option>
                <option value="ADJUSTMENT">Adjustment (Add/Remove)</option>
              </select>
              {errors.type && <p className="text-danger text-xs mt-1.5 font-medium">{errors.type.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                Quantity (in {product.unit}s) <span className="text-danger">*</span>
              </label>
              <input
                {...register("quantity", { valueAsNumber: true })}
                className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-lg font-bold font-heading placeholder:text-text-muted/50"
                placeholder="0"
                type="number"
                step="1"
              />
              <p className="text-[10px] text-text-muted mt-1.5 font-medium">
                For WASTAGE, enter a positive number, we will subtract it automatically.
                For ADJUSTMENT, use negative values to reduce stock.
              </p>
              {errors.quantity && <p className="text-danger text-xs mt-1.5 font-medium">{errors.quantity.message}</p>}
            </div>

          </form>
        </div>

        <div className="p-6 border-t border-border bg-surface shrink-0">
          <button
            type="submit"
            form="inventory-form"
            disabled={isSubmitting}
            className="w-full touch-target flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-text font-bold text-base hover:bg-primary-hover active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none shadow-md"
          >
            {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : "Confirm Adjustment"}
          </button>
        </div>
      </div>
    </>
  );
}
