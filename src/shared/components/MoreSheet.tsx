"use client";

import React, { useEffect, useRef, useCallback } from "react";
import Link from "next/link";

/* ============================================================
   MoreSheet — Plan Section 9 Lines 333–342
   Mobile "More" bottom sheet listing secondary navigation items.
   ============================================================ */

interface MoreSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

const moreItems = [
  { label: "Products", icon: "🎂", href: "/products" },
  { label: "Inventory", icon: "📦", href: "/inventory" },
  { label: "Expenses", icon: "💰", href: "/expenses" },
  { label: "Analytics", icon: "📊", href: "/analytics" },
  { label: "Receipts", icon: "🧾", href: "/receipts" },
  { label: "Settings", icon: "⚙️", href: "/settings" },
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
        className="fixed inset-0 z-40 bg-black/30 transition-opacity md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label="More navigation options"
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-surface border-t border-border rounded-t-2xl shadow-elevated safe-bottom animate-slide-up"
      >
        {/* Drag Handle */}
        <div className="flex justify-center py-3">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Sheet Header */}
        <div className="flex items-center justify-between px-5 pb-3">
          <h2 className="text-base font-semibold font-heading">More</h2>
          <button
            onClick={onClose}
            className="touch-target text-text-muted hover:text-text text-sm font-medium px-2 py-1 rounded-md"
            aria-label="Close more menu"
          >
            ✕
          </button>
        </div>

        {/* Navigation Items */}
        <nav aria-label="Secondary navigation">
          <ul className="px-4 pb-6 space-y-1" role="list">
            {moreItems.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className="touch-target flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-text hover:bg-surface-hover transition-colors"
                >
                  <span aria-hidden="true" className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
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
          animation: slide-up 0.25s ease-out;
        }
      `}</style>
    </>
  );
}
