"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "@/shared/theme/ThemeProvider";
import { MoreSheet } from "@/shared/components/MoreSheet";
import { 
  Home, 
  ShoppingBag, 
  Users, 
  Menu, 
  Cake, 
  Package, 
  CircleDollarSign, 
  BarChart3, 
  ReceiptText, 
  Settings 
} from "lucide-react";

/* ============================================================
   Navigation Configuration — Plan Section 9 (Lines 324–367)
   ============================================================ */

/** Mobile bottom nav: 4 items per plan Lines 324–331 */
const mobileNavItems = [
  { id: "home", label: "Home", icon: Home, href: "/" },
  { id: "orders", label: "Orders", icon: ShoppingBag, href: "/orders" },
  { id: "customers", label: "Customers", icon: Users, href: "/customers" },
  { id: "more", label: "More", icon: Menu, href: "#more" },
] as const;

/** Desktop sidebar: 9 items per plan Lines 357–367 */
const desktopNavItems = [
  { id: "dashboard", label: "Dashboard", icon: Home, href: "/" },
  { id: "orders", label: "Orders", icon: ShoppingBag, href: "/orders" },
  { id: "customers", label: "Customers", icon: Users, href: "/customers" },
  { id: "products", label: "Products", icon: Cake, href: "/products" },
  { id: "inventory", label: "Inventory", icon: Package, href: "/inventory" },
  { id: "expenses", label: "Expenses", icon: CircleDollarSign, href: "/expenses" },
  { id: "analytics", label: "Analytics", icon: BarChart3, href: "/analytics" },
  { id: "receipts", label: "Receipts", icon: ReceiptText, href: "/receipts" },
  { id: "settings", label: "Settings", icon: Settings, href: "/settings" },
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
          Desktop Sidebar (>= 768px)
          ============================================================ */}
      <aside className="hidden md:flex md:w-64 flex-col border-r border-border bg-surface flex-shrink-0">
        {/* Bakery Brand */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-border">
          <div className="w-10 h-10 rounded-full bg-primary text-primary-text border border-primary-light flex items-center justify-center shadow-card shrink-0">
            <Cake size={20} strokeWidth={2.5} />
          </div>
          <div>
            <span className="font-semibold text-lg leading-tight font-heading block tracking-tight">
              Ovenly
            </span>
            <span className="text-[11px] text-text-muted font-medium uppercase tracking-wider">
              Home Bakery
            </span>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav aria-label="Main navigation" className="flex-1 px-3 py-4">
          <ul className="space-y-1" role="list">
            {desktopNavItems.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`touch-target w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-[0.98] ${
                      active
                        ? "bg-primary text-primary-text shadow-md"
                        : "text-text-muted hover:bg-surface-hover hover:text-text"
                    }`}
                  >
                    <Icon size={18} strokeWidth={active ? 2.5 : 2} className="shrink-0" />
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
            <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-accent text-secondary border border-accent-border">
              BAKER
            </span>
          </div>

          <div
            className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-surface-hover border border-border"
            role="radiogroup"
            aria-label="Select visual theme"
          >
            <button
              onClick={() => setTheme("clean")}
              role="radio"
              aria-checked={theme === "clean"}
              className={`touch-target py-1.5 text-xs font-medium rounded-lg transition-all active:scale-95 ${
                theme === "clean"
                  ? "bg-surface text-primary shadow-sm font-bold border border-border/50"
                  : "text-text-muted hover:text-text"
              }`}
            >
              Clean
            </button>
            <button
              onClick={() => setTheme("peach")}
              role="radio"
              aria-checked={theme === "peach"}
              className={`touch-target py-1.5 text-xs font-medium rounded-lg transition-all active:scale-95 ${
                theme === "peach"
                  ? "bg-surface text-primary shadow-sm font-bold border border-border/50"
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
            Mobile Header (< 768px)
            Added glassmorphism (backdrop-blur-md bg-surface/85)
            ============================================================ */}
        <header className="md:hidden sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-surface/85 backdrop-blur-md border-b border-border shadow-sm safe-top transition-colors">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-text flex items-center justify-center shadow-card shrink-0">
              <Cake size={16} strokeWidth={2.5} />
            </div>
            <h1 className="font-bold text-base font-heading tracking-tight">
              Ovenly
            </h1>
          </div>

          {/* Theme Toggle (Mobile) */}
          <button
            onClick={() => setTheme(theme === "clean" ? "peach" : "clean")}
            className="touch-target px-3 py-1.5 text-xs font-bold rounded-full bg-accent text-secondary border border-accent-border active:scale-95 transition-all"
            aria-label={`Switch to ${theme === "clean" ? "Peach" : "Clean"} Bakery theme`}
            aria-pressed={theme === "peach"}
          >
            {theme === "clean" ? "Clean" : "Peach"}
          </button>
        </header>

        {/* Desktop Header (>= 768px) */}
        <header className="hidden md:flex items-center justify-between px-6 py-3 bg-surface/85 backdrop-blur-md border-b border-border sticky top-0 z-10">
          <div>
            <h1 className="text-lg font-bold font-heading text-text">
              {desktopNavItems.find((item) => isActive(item.href))?.label ?? "Dashboard"}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setTheme(theme === "clean" ? "peach" : "clean")}
              className="touch-target px-4 py-1.5 text-xs font-bold rounded-full bg-accent text-secondary border border-accent-border hover:bg-accent/80 active:scale-95 transition-all"
              aria-label={`Switch to ${theme === "clean" ? "Peach" : "Clean"} Bakery theme`}
            >
              {theme === "clean" ? "Peach Theme" : "Clean Theme"}
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
          Added glassmorphism (backdrop-blur-md bg-surface/85)
          ============================================================ */}
      <nav
        aria-label="Main navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-surface/85 backdrop-blur-md border-t border-border px-2 pt-2 pb-2 safe-bottom shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] transition-colors"
      >
        <ul className="flex items-center justify-around" role="list">
          {mobileNavItems.map((item) => {
            const isMoreButton = item.id === "more";
            const active = isMoreButton ? moreOpen : isActive(item.href);
            const Icon = item.icon;

            const buttonClass = `touch-target flex flex-col items-center justify-center py-1.5 px-3 rounded-xl min-w-[64px] transition-all active:scale-95 ${
              active
                ? "text-primary font-bold bg-primary-light/50"
                : "text-text-muted hover:text-text"
            }`;

            if (isMoreButton) {
              return (
                <li key={item.id}>
                  <button
                    onClick={toggleMore}
                    aria-expanded={moreOpen}
                    aria-haspopup="dialog"
                    className={buttonClass}
                  >
                    <Icon size={20} strokeWidth={active ? 2.5 : 2} className="mb-1" />
                    <span className="text-[10px] tracking-tight">{item.label}</span>
                  </button>
                </li>
              );
            }

            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={buttonClass}
                >
                  <Icon size={20} strokeWidth={active ? 2.5 : 2} className="mb-1" />
                  <span className="text-[10px] tracking-tight">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* More Sheet */}
      <MoreSheet isOpen={moreOpen} onClose={closeMore} />
    </div>
  );
}
