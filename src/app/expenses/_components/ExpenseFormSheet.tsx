"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2 } from "lucide-react";
import { type Expense } from "@/modules/expenses/expenses.types";
import { fetcher } from "@/shared/api/client";
import { z } from "zod";

interface ExpenseFormSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Expense;
}

// Client-side schema that accepts amount in rupees for UI
const formSchema = z.object({
  category: z.enum([
    'Ingredients', 'Packaging', 'Delivery', 'Equipment', 'Utilities', 'Marketing', 'Rent', 'Other'
  ]),
  description: z.string().min(1, "Description is required").max(500),
  amountRupees: z.number().min(0.01, "Amount must be greater than 0"),
  expenseDate: z.string().date("Must be a valid date"),
  paymentMethod: z.enum(['CASH', 'UPI', 'BANK_TRANSFER', 'CARD', 'OTHER']),
});

type FormValues = z.infer<typeof formSchema>;

export function ExpenseFormSheet({ isOpen, onClose, onSuccess, initialData }: ExpenseFormSheetProps) {
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
      category: "Ingredients",
      description: "",
      amountRupees: 0,
      expenseDate: new Date().toISOString().split("T")[0], // Today
      paymentMethod: "CASH",
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        reset({
          category: initialData.category,
          description: initialData.description,
          amountRupees: initialData.amount / 100, // Convert paise to rupees
          expenseDate: initialData.expenseDate,
          paymentMethod: initialData.paymentMethod,
        });
      } else {
        reset({
          category: "Ingredients",
          description: "",
          amountRupees: 0,
          expenseDate: new Date().toISOString().split("T")[0],
          paymentMethod: "CASH",
        });
      }
    }
  }, [isOpen, initialData, reset]);

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    setError(null);

    // Convert rupees to paise safely
    const amountPaise = Math.round(data.amountRupees * 100);

    const payload = {
      category: data.category,
      description: data.description,
      amount: amountPaise,
      expenseDate: data.expenseDate,
      paymentMethod: data.paymentMethod,
    };

    try {
      if (initialData) {
        await fetcher(`/api/expenses/${initialData.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await fetcher("/api/expenses", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      onSuccess();
      onClose();
    } catch (err) {
      const e = err as Error;
      setError(e.message || "Failed to save expense");
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
            {initialData ? "Edit Expense" : "New Expense"}
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

          <form id="expense-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                  Amount (₹) <span className="text-danger">*</span>
                </label>
                <input
                  {...register("amountRupees", { valueAsNumber: true })}
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm font-bold font-heading placeholder:text-text-muted/50"
                  placeholder="0.00"
                  type="number"
                  step="0.01"
                  min="0.01"
                  autoFocus
                />
                {errors.amountRupees && <p className="text-danger text-xs mt-1.5 font-medium">{errors.amountRupees.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                  Date <span className="text-danger">*</span>
                </label>
                <input
                  {...register("expenseDate")}
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm font-medium placeholder:text-text-muted/50"
                  type="date"
                />
                {errors.expenseDate && <p className="text-danger text-xs mt-1.5 font-medium">{errors.expenseDate.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                Category <span className="text-danger">*</span>
              </label>
              <select
                {...register("category")}
                className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm font-medium"
              >
                <option value="Ingredients">Ingredients</option>
                <option value="Packaging">Packaging</option>
                <option value="Delivery">Delivery</option>
                <option value="Equipment">Equipment</option>
                <option value="Utilities">Utilities</option>
                <option value="Marketing">Marketing</option>
                <option value="Rent">Rent</option>
                <option value="Other">Other</option>
              </select>
              {errors.category && <p className="text-danger text-xs mt-1.5 font-medium">{errors.category.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                Description <span className="text-danger">*</span>
              </label>
              <input
                {...register("description")}
                className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm font-medium placeholder:text-text-muted/50"
                placeholder="e.g. Flour and Sugar"
              />
              {errors.description && <p className="text-danger text-xs mt-1.5 font-medium">{errors.description.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                Payment Method <span className="text-danger">*</span>
              </label>
              <select
                {...register("paymentMethod")}
                className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm font-medium"
              >
                <option value="CASH">Cash</option>
                <option value="UPI">UPI</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CARD">Card</option>
                <option value="OTHER">Other</option>
              </select>
              {errors.paymentMethod && <p className="text-danger text-xs mt-1.5 font-medium">{errors.paymentMethod.message}</p>}
            </div>

          </form>
        </div>

        <div className="p-6 border-t border-border bg-surface shrink-0">
          <button
            type="submit"
            form="expense-form"
            disabled={isSubmitting}
            className="w-full touch-target flex items-center justify-center gap-2 rounded-xl bg-danger text-white font-bold text-base hover:bg-danger/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none shadow-md"
          >
            {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : "Save Expense"}
          </button>
        </div>
      </div>
    </>
  );
}
