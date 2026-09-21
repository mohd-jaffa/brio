"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "@/shared/theme/ThemeProvider";
import { MoreSheet } from "@/shared/components/MoreSheet";

/* ============================================================
   Navigation Configuration — Plan Section 9 (Lines 324–367)
   ============================================================ */

/** Mobile bottom nav: 4 items per plan Lines 324–331 */
const mobileNavItems = [
  { id: "home", label: "Home", icon: "🧁", href: "/" },
  { id: "orders", label: "Orders", icon: "🛍️", href: "/orders" },
  { id: "customers", label: "Customers", icon: "👥", href: "/customers" },
  { id: "more", label: "More", icon: "☰", href: "#more" },
] as const;

/** Desktop sidebar: 9 items per plan Lines 357–367 */
const desktopNavItems = [
  { id: "dashboard", label: "Dashboard", icon: "🧁", href: "/" },
  { id: "orders", label: "Orders", icon: "🛍️", href: "/orders" },
  { id: "customers", label: "Customers", icon: "👥", href: "/customers" },
  { id: "products", label: "Products", icon: "🎂", href: "/products" },
  { id: "inventory", label: "Inventory", icon: "📦", href: "/inventory" },
  { id: "expenses", label: "Expenses", icon: "💰", href: "/expenses" },
  { id: "analytics", label: "Analytics", icon: "📊", href: "/analytics" },
  { id: "receipts", label: "Receipts", icon: "🧾", href: "/receipts" },
  { id: "settings", label: "Settings", icon: "⚙️", href: "/settings" },
] as const;

/* ============================================================
   AppShell Component
   Plan Section 41 — Mobile & Desktop Layout Wireframes
   ============================================================ */

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const toggleMore = useCallback(() => {
    setMoreOpen((prev) => !prev);
  }, []);

  const closeMore = useCallback(() => {
    setMoreOpen(false);
  }, []);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background text-text">
      {/* ============================================================
          Desktop Sidebar (>= 768px) — Plan Section 41 Desktop Wireframe
          ============================================================ */}
      <aside className="hidden md:flex md:w-64 flex-col border-r border-border bg-surface flex-shrink-0">
        {/* Bakery Brand */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-border">
          <div className="w-10 h-10 rounded-full bg-accent border border-accent-border flex items-center justify-center text-xl shadow-card">
            <span aria-hidden="true">🧁</span>
          </div>
          <div>
            <span className="font-semibold text-lg leading-tight font-heading block">
              Ovenly
            </span>
            <span className="text-xs text-text-muted font-medium">
              Home Bakery Manager
            </span>
          </div>
        </div>

        {/* Desktop Navigation — Plan Section 9 Lines 357–367 */}
        <nav aria-label="Main navigation" className="flex-1 px-3 py-4">
          <ul className="space-y-1" role="list">
            {desktopNavItems.map((item) => {
              const active = isActive(item.href);
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`touch-target w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? "bg-primary text-primary-text shadow-card"
                        : "text-text-muted hover:bg-surface-hover hover:text-text"
                    }`}
                  >
                    <span aria-hidden="true" className="text-lg">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Theme Selector — Sidebar Footer */}
        <div className="px-4 py-4 border-t border-border space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-muted">
              Visual Theme
            </span>
            <span className="text-[11px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded bg-accent text-secondary border border-accent-border">
              BAKER
            </span>
          </div>

          <div
            className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-surface-hover border border-border"
            role="radiogroup"
            aria-label="Select visual theme"
          >
            <button
              onClick={() => setTheme("clean")}
              role="radio"
              aria-checked={theme === "clean"}
              className={`touch-target py-1.5 text-xs font-medium rounded-md transition-all ${
                theme === "clean"
                  ? "bg-surface text-primary shadow-card font-semibold"
                  : "text-text-muted hover:text-text"
              }`}
            >
              Clean
            </button>
            <button
              onClick={() => setTheme("peach")}
              role="radio"
              aria-checked={theme === "peach"}
              className={`touch-target py-1.5 text-xs font-medium rounded-md transition-all ${
                theme === "peach"
                  ? "bg-surface text-primary shadow-card font-semibold"
                  : "text-text-muted hover:text-text"
              }`}
            >
              Peach
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* ============================================================
            Mobile Header (< 768px) — Plan Section 41 Mobile Wireframe
            ============================================================ */}
        <header className="md:hidden sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-surface border-b border-border shadow-card safe-top">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-accent border border-accent-border flex items-center justify-center text-base">
              <span aria-hidden="true">🧁</span>
            </div>
            <h1 className="font-bold text-base font-heading">
              Ovenly
            </h1>
          </div>

          {/* Theme Toggle (Mobile) */}
          <button
            onClick={() => setTheme(theme === "clean" ? "peach" : "clean")}
            className="touch-target px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-surface-hover text-primary border border-border"
            aria-label={`Switch to ${theme === "clean" ? "Peach" : "Clean"} Bakery theme`}
            aria-pressed={theme === "peach"}
          >
            {theme === "clean" ? "🥐 Clean" : "🍑 Peach"}
          </button>
        </header>

        {/* ============================================================
            Desktop Header (>= 768px) — Plan Section 41 Desktop Wireframe
            The plan shows Header above Content, adjacent to sidebar.
            ============================================================ */}
        <header className="hidden md:flex items-center justify-between px-6 py-3 bg-surface border-b border-border">
          <div>
            <h1 className="text-lg font-semibold font-heading">
              {desktopNavItems.find((item) => isActive(item.href))?.label ?? "Dashboard"}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setTheme(theme === "clean" ? "peach" : "clean")}
              className="touch-target px-3 py-1.5 text-xs font-semibold rounded-lg bg-surface-hover text-primary border border-border hover:bg-primary-light transition-colors"
              aria-label={`Switch to ${theme === "clean" ? "Peach" : "Clean"} Bakery theme`}
            >
              {theme === "clean" ? "🍑 Peach Theme" : "🥐 Clean Theme"}
            </button>
          </div>
        </header>

        {/* Content Container */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-5xl w-full mx-auto pb-24 md:pb-8">
          {children}
        </main>
      </div>

      {/* ============================================================
          Mobile Bottom Navigation (< 768px)
          Plan Section 9 Lines 324–331: Home, Orders, Customers, More
          ============================================================ */}
      <nav
        aria-label="Main navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-surface border-t border-border px-2 pt-1.5 pb-1.5 safe-bottom shadow-elevated"
      >
        <ul className="flex items-center justify-around" role="list">
          {mobileNavItems.map((item) => {
            const isMoreButton = item.id === "more";
            const active = isMoreButton ? moreOpen : isActive(item.href);

            if (isMoreButton) {
              return (
                <li key={item.id}>
                  <button
                    onClick={toggleMore}
                    aria-expanded={moreOpen}
                    aria-haspopup="dialog"
                    className={`touch-target flex flex-col items-center justify-center py-1 px-3 rounded-lg min-w-[56px] transition-colors ${
                      active
                        ? "text-primary font-semibold"
                        : "text-text-muted hover:text-text"
                    }`}
                  >
                    <span aria-hidden="true" className="text-xl leading-none mb-0.5">{item.icon}</span>
                    <span className="text-xs tracking-tight">{item.label}</span>
                  </button>
                </li>
              );
            }

            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`touch-target flex flex-col items-center justify-center py-1 px-3 rounded-lg min-w-[56px] transition-colors ${
                    active
                      ? "text-primary font-semibold"
                      : "text-text-muted hover:text-text"
                  }`}
                >
                  <span aria-hidden="true" className="text-xl leading-none mb-0.5">{item.icon}</span>
                  <span className="text-xs tracking-tight">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* More Sheet — Plan Section 9 Lines 333–342 */}
      <MoreSheet isOpen={moreOpen} onClose={closeMore} />
    </div>
  );
}
