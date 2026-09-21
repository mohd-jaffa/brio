"use client";

import React, { useState } from "react";
import { useTheme, Theme } from "@/shared/theme/ThemeProvider";

interface AppShellProps {
  children: React.ReactNode;
  activeTab?: "home" | "orders" | "products" | "inventory" | "more";
}

export function AppShell({ children, activeTab = "home" }: AppShellProps) {
  const { theme, setTheme } = useTheme();
  const [currentTab, setCurrentTab] = useState(activeTab);

  const navItems = [
    { id: "home", label: "Home", icon: "🧁" },
    { id: "orders", label: "Orders", icon: "🛍️" },
    { id: "products", label: "Products", icon: "🎂" },
    { id: "inventory", label: "Stock", icon: "📦" },
    { id: "more", label: "More", icon: "⚙️" },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[var(--color-bg)] text-[var(--color-text)] transition-colors duration-200">
      {/* Desktop Sidebar (>= 768px) */}
      <aside className="hidden md:flex md:w-64 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] p-4 flex-shrink-0">
        {/* Bakery Header */}
        <div className="flex items-center gap-3 px-2 py-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-[var(--color-accent)] border border-[var(--color-accent-border)] flex items-center justify-center text-xl shadow-xs">
            🧁
          </div>
          <div>
            <h1 className="font-semibold text-lg leading-tight font-[var(--font-heading)]">
              Ovenly
            </h1>
            <span className="text-xs text-[var(--color-text-muted)] font-medium">
              Home Bakery Manager
            </span>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id as typeof currentTab)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[var(--color-primary)] text-[var(--color-primary-text)] shadow-xs"
                    : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Theme Selector & Role Badge */}
        <div className="pt-4 border-t border-[var(--color-border)] space-y-3">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs font-medium text-[var(--color-text-muted)]">
              Visual Theme
            </span>
            <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded bg-[var(--color-accent)] text-[var(--color-secondary)] border border-[var(--color-accent-border)]">
              BAKER
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-[var(--color-surface-hover)] border border-[var(--color-border)]">
            <button
              onClick={() => setTheme("clean")}
              className={`py-1.5 text-xs font-medium rounded-md transition-all ${
                theme === "clean"
                  ? "bg-[var(--color-surface)] text-[var(--color-primary)] shadow-xs font-semibold"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              }`}
            >
              Clean
            </button>
            <button
              onClick={() => setTheme("peach")}
              className={`py-1.5 text-xs font-medium rounded-md transition-all ${
                theme === "peach"
                  ? "bg-[var(--color-surface)] text-[var(--color-primary)] shadow-xs font-semibold"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              }`}
            >
              Peach
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header (< 768px) */}
        <header className="md:hidden sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-[var(--color-surface)] border-b border-[var(--color-border)] shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[var(--color-accent)] border border-[var(--color-accent-border)] flex items-center justify-center text-base">
              🧁
            </div>
            <span className="font-bold text-base font-[var(--font-heading)]">
              Ovenly
            </span>
          </div>

          {/* Theme Switcher Toggle (Mobile) */}
          <div className="flex items-center gap-1 bg-[var(--color-surface-hover)] p-1 rounded-lg border border-[var(--color-border)]">
            <button
              onClick={() => setTheme(theme === "clean" ? "peach" : "clean")}
              className="px-2.5 py-1 text-xs font-semibold rounded-md bg-[var(--color-accent)] text-[var(--color-primary)] border border-[var(--color-accent-border)]"
              aria-label="Toggle visual theme"
            >
              Theme: {theme === "clean" ? "Clean 🥐" : "Peach 🍑"}
            </button>
          </div>
        </header>

        {/* Content Container (Responsive Viewports 360px / 390px / 414px) */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-5xl w-full mx-auto pb-20 md:pb-8">
          {children}
        </main>
      </div>

      {/* Mobile Fixed Bottom Navigation Bar (< 768px) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[var(--color-surface)] border-t border-[var(--color-border)] px-2 py-1.5 flex items-center justify-around shadow-lg">
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id as typeof currentTab)}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg min-w-[56px] transition-colors ${
                isActive
                  ? "text-[var(--color-primary)] font-semibold"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              }`}
            >
              <span className="text-xl leading-none mb-0.5">{item.icon}</span>
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
