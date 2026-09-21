"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/shared/components/AppShell";
import { ArrowLeft, Info } from "lucide-react";

export default function NewOrderPage() {
  const router = useRouter();

  return (
    <AppShell>
      <div className="space-y-6 lg:space-y-8 animate-fade-in-up pb-24 md:pb-8">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => router.back()}
            className="touch-target flex items-center gap-2 text-text-muted hover:text-text transition-colors font-bold text-sm bg-surface p-2 pr-4 rounded-full border border-border shadow-sm active:scale-95"
          >
            <ArrowLeft size={18} strokeWidth={2.5} /> Back
          </button>
        </div>

        <section>
          <h2 className="text-2xl sm:text-3xl font-bold font-heading text-text tracking-tight mb-2">
            Create Order
          </h2>
          <p className="text-sm text-text-muted font-medium mb-6">
            The complex multi-step order flow will be implemented here.
          </p>

          <div className="p-8 text-center bg-surface border border-border border-dashed rounded-2xl flex flex-col items-center">
            <Info size={48} className="text-primary/50 mb-4" />
            <h3 className="font-bold text-lg mb-2">Order Flow Construction</h3>
            <p className="text-sm text-text-muted max-w-sm">
              The order creation flow involves selecting a customer, managing dynamic line items, applying discounts, and recalculating totals in real-time. This module is scoped for a dedicated implementation block.
            </p>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
