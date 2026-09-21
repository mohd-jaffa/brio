"use client";

import { AppShell } from "@/shared/components/AppShell";

/* ============================================================
   Dashboard — Plan Section 84: Recommended Dashboard Priority
   1. Greeting / business context
   2. Business summary card (Section 77)
   3. Pending orders grouped by due date (Section 78–80)
   4. Quick actions (Section 82)
   5. Low stock alerts
   6. Monthly business snapshot (Section 83)
   7. View full analytics link
   ============================================================ */

export default function Home() {
  return (
    <AppShell>
      <div className="space-y-6">
        {/* ============================================================
            Priority 1: Greeting / Business Context
            Plan Section 84 Line 3268
            ============================================================ */}
        <section>
          <p className="text-xs font-semibold tracking-wider text-secondary uppercase">
            Dashboard
          </p>
          <h2 className="text-xl sm:text-2xl font-bold font-heading text-primary mt-0.5">
            Good morning, Baker! <span aria-hidden="true">👋</span>
          </h2>
          <p className="text-sm text-text-muted mt-0.5">
            Here&apos;s your bakery today.
          </p>
        </section>

        {/* ============================================================
            Priority 2: Business Summary Card
            Plan Section 77 (Lines 3045–3082)
            ============================================================ */}
        <section
          className="p-4 rounded-xl bg-accent border border-accent-border shadow-card"
          aria-label="Today's business summary"
        >
          <h3 className="text-sm font-semibold font-heading mb-3">
            <span aria-hidden="true">📋</span> Business Today
          </h3>
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-background border border-border">
              <dt className="text-xs text-text-muted font-medium">Today&apos;s Orders</dt>
              <dd className="text-2xl font-bold font-heading text-primary mt-1">8</dd>
            </div>
            <div className="p-3 rounded-lg bg-background border border-border">
              <dt className="text-xs text-text-muted font-medium">Today&apos;s Revenue</dt>
              <dd className="text-2xl font-bold font-heading text-success mt-1">₹4,850</dd>
            </div>
            <div className="p-3 rounded-lg bg-background border border-border">
              <dt className="text-xs text-text-muted font-medium">Pending Orders</dt>
              <dd className="text-2xl font-bold font-heading text-warning mt-1">3</dd>
            </div>
            <div className="p-3 rounded-lg bg-background border border-border">
              <dt className="text-xs text-text-muted font-medium">Pending Payments</dt>
              <dd className="text-2xl font-bold font-heading text-danger mt-1">₹1,250</dd>
            </div>
          </dl>
        </section>

        {/* ============================================================
            Priority 3: Pending Orders grouped by due date
            Plan Section 78–80, 81 (Lines 3084–3207)
            Default sort: Overdue → Due Today → Tomorrow → Upcoming
            ============================================================ */}
        <section aria-label="Pending orders">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold font-heading">
              <span aria-hidden="true">🛍️</span> Pending Orders
            </h3>
            <span className="text-xs text-text-muted font-medium">Sorted by due date</span>
          </div>

          {/* Overdue Group */}
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-danger uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span aria-hidden="true">⚠</span> Overdue
            </h4>
            <ul className="space-y-2" role="list">
              <li>
                <article className="flex items-center justify-between p-3 rounded-xl bg-danger-bg border border-border border-l-4 border-l-danger shadow-card">
                  <div>
                    <span className="font-semibold text-sm block">#1023 • Meena Gupta</span>
                    <span className="text-xs text-text-muted">Brownie × 6 • Yesterday, 4:00 PM</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-sm block">₹480</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-danger/10 text-danger">
                      PENDING
                    </span>
                  </div>
                </article>
              </li>
            </ul>
          </div>

          {/* Due Today Group */}
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-warning uppercase tracking-wider mb-2">
              Due Today
            </h4>
            <ul className="space-y-2" role="list">
              <li>
                <article className="flex items-center justify-between p-3 rounded-xl bg-surface border border-border border-l-4 border-l-warning shadow-card">
                  <div>
                    <span className="font-semibold text-sm block">#1024 • Anu Sharma</span>
                    <span className="text-xs text-text-muted">Chocolate Truffle Cake (2 kg) • Today, 4:00 PM</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-sm block">₹1,800</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-warning/10 text-warning">
                      IN PROGRESS
                    </span>
                  </div>
                </article>
              </li>
              <li>
                <article className="flex items-center justify-between p-3 rounded-xl bg-surface border border-border border-l-4 border-l-primary shadow-card">
                  <div>
                    <span className="font-semibold text-sm block">#1025 • Rahul Verma</span>
                    <span className="text-xs text-text-muted">Red Velvet Cupcakes (12 pcs) • Today, 5:30 PM</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-sm block">₹950</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-accent text-primary border border-accent-border">
                      CONFIRMED
                    </span>
                  </div>
                </article>
              </li>
            </ul>
          </div>

          {/* Tomorrow Group */}
          <div className="mb-2">
            <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
              Tomorrow
            </h4>
            <ul className="space-y-2" role="list">
              <li>
                <article className="flex items-center justify-between p-3 rounded-xl bg-surface border border-border shadow-card">
                  <div>
                    <span className="font-semibold text-sm block">#1026 • Ananya Roy</span>
                    <span className="text-xs text-text-muted">Sourdough Bread (2 loaves) • Tomorrow, 10:00 AM</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-sm block">₹500</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-accent text-primary border border-accent-border">
                      CONFIRMED
                    </span>
                  </div>
                </article>
              </li>
              <li>
                <article className="flex items-center justify-between p-3 rounded-xl bg-surface border border-border shadow-card">
                  <div>
                    <span className="font-semibold text-sm block">#1027 • Sneha Kapoor</span>
                    <span className="text-xs text-text-muted">Vanilla Buttercream Cake • Tomorrow, 2:00 PM</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-sm block">₹1,500</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-accent text-primary border border-accent-border">
                      PENDING
                    </span>
                  </div>
                </article>
              </li>
            </ul>
          </div>
        </section>

        {/* ============================================================
            Priority 4: Quick Actions
            Plan Section 82 (Lines 3209–3234)
            Mobile: compact row | Desktop: horizontal button bar
            ============================================================ */}
        <section aria-label="Quick actions">
          <h3 className="text-sm font-bold font-heading mb-3">
            <span aria-hidden="true">⚡</span> Quick Actions
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: "+ Add Order", icon: "🛍️" },
              { label: "+ Add Customer", icon: "👥" },
              { label: "+ Add Stock", icon: "📦" },
              { label: "+ Add Expense", icon: "💰" },
            ].map((action) => (
              <button
                key={action.label}
                className="touch-target flex items-center justify-center gap-2 px-3 py-3 rounded-xl bg-surface border border-border text-sm font-medium text-text hover:bg-surface-hover hover:border-primary/30 transition-colors shadow-card"
              >
                <span aria-hidden="true">{action.icon}</span>
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ============================================================
            Priority 5: Low Stock Alerts
            Plan Section 84 Line 3284
            ============================================================ */}
        <section aria-label="Low stock alerts">
          <h3 className="text-sm font-bold font-heading mb-3">
            <span aria-hidden="true">📦</span> Low Stock Alerts
          </h3>
          <ul className="space-y-2" role="list">
            <li className="p-3 rounded-xl bg-surface border border-border border-l-4 border-l-danger shadow-card">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-danger uppercase">Reorder Soon</span>
                  <h4 className="font-semibold text-sm mt-0.5">Unsalted Butter</h4>
                  <p className="text-xs text-text-muted">Current: 800g • Threshold: 2,000g</p>
                </div>
                <button className="touch-target px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-text hover:bg-primary-hover transition-colors">
                  + Stock
                </button>
              </div>
            </li>
            <li className="p-3 rounded-xl bg-surface border border-border border-l-4 border-l-warning shadow-card">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-warning uppercase">Running Low</span>
                  <h4 className="font-semibold text-sm mt-0.5">Cocoa Powder</h4>
                  <p className="text-xs text-text-muted">Current: 500g • Threshold: 1,000g</p>
                </div>
                <button className="touch-target px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-text hover:bg-primary-hover transition-colors">
                  + Stock
                </button>
              </div>
            </li>
          </ul>
        </section>

        {/* ============================================================
            Priority 6: Monthly Business Snapshot
            Plan Section 83 (Lines 3236–3261)
            ============================================================ */}
        <section
          className="p-4 rounded-xl bg-surface border border-border shadow-card"
          aria-label="Monthly business snapshot"
        >
          <h3 className="text-sm font-bold font-heading mb-3">
            <span aria-hidden="true">📊</span> This Month
          </h3>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div className="flex justify-between py-1.5 border-b border-border">
              <dt className="text-text-muted">Revenue</dt>
              <dd className="font-semibold text-success">₹52,400</dd>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border">
              <dt className="text-text-muted">Expenses</dt>
              <dd className="font-semibold text-danger">₹18,200</dd>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border">
              <dt className="text-text-muted">Orders</dt>
              <dd className="font-semibold">74</dd>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border">
              <dt className="text-text-muted">Avg Order</dt>
              <dd className="font-semibold">₹708</dd>
            </div>
          </dl>

          {/* Priority 7: View full analytics — Plan Section 83 Line 3254 */}
          <div className="mt-3 pt-3 border-t border-border">
            <button className="touch-target text-xs font-semibold text-primary hover:text-primary-hover transition-colors">
              View Analytics <span aria-hidden="true">→</span>
            </button>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
