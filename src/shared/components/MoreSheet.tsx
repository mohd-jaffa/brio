"use client";

import React, { useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { 
  Cake, 
  Package, 
  CircleDollarSign, 
  BarChart3, 
  ReceiptText, 
  Settings,
  X
} from "lucide-react";

/* ============================================================
   MoreSheet — Plan Section 9 Lines 333–342
   Mobile "More" bottom sheet listing secondary navigation items.
   ============================================================ */

interface MoreSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

const moreItems = [
  { label: "Products", icon: Cake, href: "/products" },
  { label: "Inventory", icon: Package, href: "/inventory" },
  { label: "Expenses", icon: CircleDollarSign, href: "/expenses" },
  { label: "Analytics", icon: BarChart3, href: "/analytics" },
  { label: "Receipts", icon: ReceiptText, href: "/receipts" },
  { label: "Settings", icon: Settings, href: "/settings" },
] as const;

export function MoreSheet({ isOpen, onClose }: MoreSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label="More navigation options"
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-surface border-t border-border rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.12)] safe-bottom animate-slide-up"
      >
        {/* Drag Handle */}
        <div className="flex justify-center py-3">
          <div className="w-12 h-1.5 rounded-full bg-border" />
        </div>

        {/* Sheet Header */}
        <div className="flex items-center justify-between px-6 pb-4">
          <h2 className="text-xl font-bold font-heading">Menu</h2>
          <button
            onClick={onClose}
            className="touch-target text-text-muted hover:text-text hover:bg-surface-hover transition-colors rounded-full flex items-center justify-center p-2 active:scale-95"
            aria-label="Close more menu"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav aria-label="Secondary navigation">
          <ul className="px-4 pb-8 space-y-1" role="list">
            {moreItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className="touch-target flex items-center gap-4 px-4 py-3.5 rounded-2xl text-base font-semibold text-text hover:bg-surface-hover active:bg-surface-hover/80 active:scale-[0.98] transition-all"
                  >
                    <Icon size={22} strokeWidth={2} className="text-text-muted" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {/* Slide-up animation via inline style tag — no extra dependency */}
      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </>
  );
}
