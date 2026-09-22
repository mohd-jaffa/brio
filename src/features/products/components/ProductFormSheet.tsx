"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2 } from "lucide-react";
import { type CreateProductInput } from "@/lib/validation";
import { type Product } from "@/features/products/types";
import { z } from "zod";
import { ProductsClient } from "@/features/products/api.client";
import { getErrorMessage, ERROR_MESSAGES } from "@/constants/messages";

interface ProductFormSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Product;
}

// Create a local form schema that expects price in Rupees to allow decimal entry in the UI
const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(2000).optional(),
  priceRupees: z.number().min(0, "Price cannot be negative"),
  unit: z.string().min(1, "Unit is required"),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

export function ProductFormSheet({ isOpen, onClose, onSuccess, initialData }: ProductFormSheetProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      priceRupees: 0,
      unit: "piece",
      isActive: true,
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        reset({
          name: initialData.name,
          description: initialData.description || "",
          priceRupees: initialData.defaultPrice / 100, // Convert paise to rupees
          unit: initialData.unit,
          isActive: initialData.isActive,
        });
      } else {
        reset({
          name: "",
          description: "",
          priceRupees: 0,
          unit: "piece",
          isActive: true,
        });
      }
    }
  }, [isOpen, initialData, reset]);

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        name: data.name,
        defaultPrice: Math.round(data.priceRupees * 100),
        unit: data.unit,
        description: data.description || undefined,
        isActive: data.isActive,
      };

      if (initialData) {
        await ProductsClient.updateProduct(initialData.id, payload);
      } else {
        await ProductsClient.createProduct(payload);
      }
      
      onSuccess?.();
      onClose();
    } catch (err) {
      const e = err as Error;
      setError(e.message || getErrorMessage(ERROR_MESSAGES.EXTERNAL_SERVICE_ERROR));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

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
          <h2 className="text-xl font-bold font-heading">
            {initialData ? "Edit Product" : "New Product"}
          </h2>
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

          <form id="product-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                Product Name <span className="text-danger">*</span>
              </label>
              <input
                {...register("name")}
                className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm font-medium placeholder:text-text-muted/50"
                placeholder="e.g. Chocolate Truffle Cake"
                autoFocus
              />
              {errors.name && <p className="text-danger text-xs mt-1.5 font-medium">{errors.name.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                  Price (₹) <span className="text-danger">*</span>
                </label>
                <input
                  {...register("priceRupees", { valueAsNumber: true })}
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm font-medium placeholder:text-text-muted/50"
                  placeholder="0.00"
                  type="number"
                  step="0.01"
                  min="0"
                />
                {errors.priceRupees && <p className="text-danger text-xs mt-1.5 font-medium">{errors.priceRupees.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                  Unit <span className="text-danger">*</span>
                </label>
                <select
                  {...register("unit")}
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm font-medium"
                >
                  <option value="piece">Piece (pc)</option>
                  <option value="kg">Kilogram (kg)</option>
                  <option value="gram">Gram (g)</option>
                  <option value="box">Box</option>
                  <option value="dozen">Dozen</option>
                </select>
                {errors.unit && <p className="text-danger text-xs mt-1.5 font-medium">{errors.unit.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                Description
              </label>
              <textarea
                {...register("description")}
                className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm font-medium placeholder:text-text-muted/50 min-h-[80px]"
                placeholder="Product details..."
              />
              {errors.description && <p className="text-danger text-xs mt-1.5 font-medium">{errors.description.message}</p>}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="isActive"
                {...register("isActive")}
                className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-text">
                Available for orders
              </label>
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-border bg-surface shrink-0">
          <button
            type="submit"
            form="product-form"
            disabled={isSubmitting}
            className="w-full touch-target flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-text font-bold text-base hover:bg-primary-hover active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none shadow-md"
          >
            {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : "Save Product"}
          </button>
        </div>
      </div>
    </>
  );
}
