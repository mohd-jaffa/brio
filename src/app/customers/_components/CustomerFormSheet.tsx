"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2 } from "lucide-react";
import { createCustomerSchema, type CreateCustomerInput } from "@/modules/customers/customers.validation";
import { type Customer } from "@/modules/customers/customers.types";
import { fetcher } from "@/shared/api/client";

interface CustomerFormSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Customer;
}

export function CustomerFormSheet({ isOpen, onClose, onSuccess, initialData }: CustomerFormSheetProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateCustomerInput>({
    resolver: zodResolver(createCustomerSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      address: "",
      googleMapsLink: "",
      notes: "",
    },
  });

  // Reset form when opened or initialData changes
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        reset({
          name: initialData.name,
          phone: initialData.phone,
          email: initialData.email || "",
          address: initialData.address || "",
          googleMapsLink: initialData.googleMapsLink || "",
          notes: initialData.notes || "",
        });
      } else {
        reset({
          name: "",
          phone: "",
          email: "",
          address: "",
          googleMapsLink: "",
          notes: "",
      }
    }
  }, [isOpen, initialData, reset]);

  const onSubmit = async (data: CreateCustomerInput) => {
    setIsSubmitting(true);
    setError(null);

    try {
      if (initialData) {
        await fetcher(`/api/customers/${initialData.id}`, {
          method: "PATCH",
          body: JSON.stringify(data),
        });
      } else {
        await fetcher("/api/customers", {
          method: "POST",
          body: JSON.stringify(data),
        });
      }
      onSuccess();
      onClose();
    } catch (err) {
      const e = err as Error;
      setError(e.message || "Failed to save customer");
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
            {initialData ? "Edit Customer" : "New Customer"}
          </h2>
          <button
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

          <form id="customer-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                Full Name <span className="text-danger">*</span>
              </label>
              <input
                {...register("name")}
                className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm font-medium placeholder:text-text-muted/50"
                placeholder="e.g. Meena Gupta"
                autoFocus
              />
              {errors.name && <p className="text-danger text-xs mt-1.5 font-medium">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                Phone Number <span className="text-danger">*</span>
              </label>
              <input
                {...register("phone")}
                className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm font-medium placeholder:text-text-muted/50"
                placeholder="e.g. +91 9876543210"
                type="tel"
              />
              {errors.phone && <p className="text-danger text-xs mt-1.5 font-medium">{errors.phone.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                Email
              </label>
              <input
                {...register("email")}
                className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm font-medium placeholder:text-text-muted/50"
                placeholder="meena@example.com"
                type="email"
              />
              {errors.email && <p className="text-danger text-xs mt-1.5 font-medium">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                Address
              </label>
              <textarea
                {...register("address")}
                className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm font-medium placeholder:text-text-muted/50 min-h-[80px]"
                placeholder="Delivery address..."
              />
              {errors.address && <p className="text-danger text-xs mt-1.5 font-medium">{errors.address.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                Google Maps Link
              </label>
              <input
                {...register("googleMapsLink")}
                className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm font-medium placeholder:text-text-muted/50"
                placeholder="https://maps.app.goo.gl/..."
                type="url"
              />
              {errors.googleMapsLink && <p className="text-danger text-xs mt-1.5 font-medium">{errors.googleMapsLink.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                Notes
              </label>
              <textarea
                {...register("notes")}
                className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm font-medium placeholder:text-text-muted/50 min-h-[80px]"
                placeholder="Preferences, allergies..."
              />
              {errors.notes && <p className="text-danger text-xs mt-1.5 font-medium">{errors.notes.message}</p>}
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-border bg-surface shrink-0">
          <button
            type="submit"
            form="customer-form"
            disabled={isSubmitting}
            className="w-full touch-target flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-text font-bold text-base hover:bg-primary-hover active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none shadow-md"
          >
            {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : "Save Customer"}
          </button>
        </div>
      </div>
    </>
  );
}
