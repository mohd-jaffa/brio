"use client";

import { AppShell } from "@/shared/components/AppShell";
import { useTheme } from "@/shared/theme/ThemeProvider";

export default function Home() {
  const { theme, toggleTheme } = useTheme();

  return (
    <AppShell activeTab="home">
      <div className="space-y-6">
        {/* Welcome & Quick Action Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[var(--color-accent)] border border-[var(--color-accent-border)]">
          <div>
            <span className="text-xs font-semibold tracking-wider text-[var(--color-secondary)] uppercase">
              Operational Dashboard
            </span>
            <h2 className="text-xl sm:text-2xl font-bold font-[var(--font-heading)] text-[var(--color-primary)]">
              Welcome back, Baker! 👩‍🍳
            </h2>
            <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-0.5">
              Here is what needs your attention today.
            </p>
          </div>
          <button
            onClick={toggleTheme}
            className="self-start sm:self-center px-4 py-2 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-text)] font-semibold text-xs transition-all hover:bg-[var(--color-primary-hover)] shadow-xs"
          >
            Switch to {theme === "clean" ? "Peach Bakery 🍑" : "Clean Bakery 🥐"}
          </button>
        </div>

        {/* Priority 1: What Needs Attention Now */}
        <section className="space-y-3">
          <h3 className="text-base font-bold font-[var(--font-heading)] flex items-center gap-2">
            <span>⚡</span> Needs Attention Now
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] border-l-4 border-l-[var(--color-warning)] shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--color-warning)] uppercase">
                  Pending Order
                </span>
                <span className="text-xs text-[var(--color-text-muted)]">Due Today, 4:00 PM</span>
              </div>
              <h4 className="font-semibold text-sm mt-1">Chocolate Truffle Cake (2 kg)</h4>
              <p className="text-xs text-[var(--color-text-muted)]">Customer: Priya Sharma • ₹1,800</p>
            </div>

            <div className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] border-l-4 border-l-[var(--color-danger)] shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--color-danger)] uppercase">
                  Low Stock Alert
                </span>
                <span className="text-xs text-[var(--color-text-muted)] font-medium">Reorder Soon</span>
              </div>
              <h4 className="font-semibold text-sm mt-1">Unsalted Butter</h4>
              <p className="text-xs text-[var(--color-text-muted)]">Current: 800g (Min Threshold: 2000g)</p>
            </div>
          </div>
        </section>

        {/* Priority 2-4: Key Operational Metrics */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs">
            <span className="text-xs text-[var(--color-text-muted)] font-medium">Pending Orders</span>
            <div className="text-2xl font-bold font-[var(--font-heading)] text-[var(--color-primary)] mt-1">
              4
            </div>
            <span className="text-[10px] text-[var(--color-success)] font-medium">Due in next 48h</span>
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs">
            <span className="text-xs text-[var(--color-text-muted)] font-medium">Pending Payments</span>
            <div className="text-2xl font-bold font-[var(--font-heading)] text-[var(--color-warning)] mt-1">
              ₹2,400
            </div>
            <span className="text-[10px] text-[var(--color-text-muted)] font-medium">From 2 customers</span>
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs">
            <span className="text-xs text-[var(--color-text-muted)] font-medium">Today&apos;s Orders</span>
            <div className="text-2xl font-bold font-[var(--font-heading)] text-[var(--color-primary)] mt-1">
              3
            </div>
            <span className="text-[10px] text-[var(--color-text-muted)] font-medium">1 Delivered</span>
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs">
            <span className="text-xs text-[var(--color-text-muted)] font-medium">Today&apos;s Revenue</span>
            <div className="text-2xl font-bold font-[var(--font-heading)] text-[var(--color-success)] mt-1">
              ₹4,250
            </div>
            <span className="text-[10px] text-[var(--color-success)] font-medium">Calculated in paise</span>
          </div>
        </section>

        {/* Priority 5 & 6: Orders Queue & Business Snapshot */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm font-[var(--font-heading)]">Pending Orders (Due Date Order)</h3>
              <span className="text-xs text-[var(--color-primary)] font-semibold cursor-pointer">View All</span>
            </div>

            <div className="space-y-2">
              {[
                { name: "Red Velvet Cupcakes (12 pcs)", customer: "Rahul Verma", time: "Today, 5:30 PM", amount: "₹950", status: "CONFIRMED" },
                { name: "Sourdough Bread (2 loaves)", customer: "Ananya Roy", time: "Tomorrow, 10:00 AM", amount: "₹500", status: "BAKING" },
                { name: "Vanilla Buttercream Cake", customer: "Sneha Kapoor", time: "Tomorrow, 2:00 PM", amount: "₹1,500", status: "CONFIRMED" },
              ].map((order, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-xs">
                  <div>
                    <span className="font-semibold text-sm block">{order.name}</span>
                    <span className="text-[var(--color-text-muted)]">{order.customer} • {order.time}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold block text-sm">{order.amount}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[var(--color-accent)] text-[var(--color-primary)] border border-[var(--color-accent-border)]">
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs space-y-3">
            <h3 className="font-bold text-sm font-[var(--font-heading)]">Business Snapshot</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-[var(--color-border)]">
                <span className="text-[var(--color-text-muted)]">Active Theme</span>
                <span className="font-semibold capitalize text-[var(--color-primary)]">{theme} Bakery</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--color-border)]">
                <span className="text-[var(--color-text-muted)]">Target Viewports</span>
                <span className="font-semibold">360px / 390px / 414px</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--color-border)]">
                <span className="text-[var(--color-text-muted)]">Upload Policy</span>
                <span className="font-semibold">Logo Only (Max 500 KB)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--color-border)]">
                <span className="text-[var(--color-text-muted)]">Receipt Storage</span>
                <span className="font-semibold">On-Demand Only</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[var(--color-text-muted)]">User Role</span>
                <span className="font-semibold">BAKER</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
