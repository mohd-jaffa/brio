"use client";

import { AppShell } from "@/shared/components/AppShell";
import { 
  ClipboardList, 
  ShoppingBag, 
  Users, 
  Package, 
  CircleDollarSign, 
  TrendingUp, 
  AlertTriangle,
  Clock,
  ArrowRight
} from "lucide-react";

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
      <div className="space-y-6 lg:space-y-8 animate-fade-in-up">
        {/* ============================================================
            Priority 1: Greeting / Business Context
            ============================================================ */}
        <section>
          <p className="text-xs font-bold tracking-[0.15em] text-secondary uppercase mb-1">
            Dashboard
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold font-heading text-text tracking-tight flex items-center gap-2">
            Good morning, Baker! <span aria-hidden="true" className="origin-bottom-right animate-wave text-2xl">👋</span>
          </h2>
          <p className="text-sm text-text-muted mt-1 font-medium">
            Here&apos;s your bakery today.
          </p>
        </section>

        {/* ============================================================
            Priority 2: Business Summary Card
            ============================================================ */}
        <section
          className="p-5 rounded-2xl bg-surface border border-border shadow-card"
          aria-label="Today's business summary"
        >
          <h3 className="text-sm font-bold font-heading mb-4 flex items-center gap-2 text-text">
            <ClipboardList size={18} className="text-secondary" strokeWidth={2.5} /> 
            Business Today
          </h3>
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-background border border-border flex flex-col justify-between">
              <dt className="text-xs text-text-muted font-semibold uppercase tracking-wider mb-2">Today&apos;s Orders</dt>
              <dd className="text-2xl font-bold font-heading text-text">8</dd>
            </div>
            {/* Special Gradient for Revenue to make it pop */}
            <div className="p-3.5 rounded-xl bg-gradient-to-br from-success/10 to-success/5 border border-success/20 flex flex-col justify-between relative overflow-hidden">
              <dt className="text-xs text-success font-bold uppercase tracking-wider mb-2">Today&apos;s Revenue</dt>
              <dd className="text-2xl font-bold font-heading text-success">₹4,850</dd>
              {/* Decorative faint icon */}
              <TrendingUp size={48} className="absolute -right-2 -bottom-2 text-success/10" />
            </div>
            <div className="p-3.5 rounded-xl bg-background border border-border flex flex-col justify-between">
              <dt className="text-xs text-text-muted font-semibold uppercase tracking-wider mb-2">Pending Orders</dt>
              <dd className="text-2xl font-bold font-heading text-warning">3</dd>
            </div>
            <div className="p-3.5 rounded-xl bg-danger-bg/50 border border-danger/20 flex flex-col justify-between">
              <dt className="text-xs text-danger font-bold uppercase tracking-wider mb-2">Pending Payments</dt>
              <dd className="text-2xl font-bold font-heading text-danger">₹1,250</dd>
            </div>
          </dl>
        </section>

        {/* ============================================================
            Priority 3: Pending Orders grouped by due date
            ============================================================ */}
        <section aria-label="Pending orders">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold font-heading flex items-center gap-2 text-text">
              <ShoppingBag size={18} className="text-primary" strokeWidth={2.5} /> 
              Pending Orders
            </h3>
            <span className="text-xs text-text-muted font-medium bg-surface-hover px-2 py-1 rounded-md">Sorted by due date</span>
          </div>

          {/* Overdue Group */}
          <div className="mb-5">
            <h4 className="text-[11px] font-bold text-danger uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <AlertTriangle size={14} strokeWidth={2.5} /> Overdue
            </h4>
            <ul className="space-y-2.5" role="list">
              <li>
                <article className="flex items-center justify-between p-4 rounded-2xl bg-danger-bg border border-danger/20 border-l-4 border-l-danger shadow-sm cursor-pointer hover:bg-danger-bg/80 active:scale-[0.99] transition-all">
                  <div>
                    <span className="font-bold text-sm block text-danger">#1023 • Meena Gupta</span>
                    <span className="text-xs text-danger/80 font-medium mt-0.5 block">Brownie × 6 • Yesterday, 4:00 PM</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-sm block text-danger mb-1">₹480</span>
                    <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded flex items-center gap-1 bg-danger text-white">
                      <Clock size={10} strokeWidth={3} /> PENDING
                    </span>
                  </div>
                </article>
              </li>
            </ul>
          </div>

          {/* Due Today Group */}
          <div className="mb-5">
            <h4 className="text-[11px] font-bold text-warning uppercase tracking-wider mb-2">
              Due Today
            </h4>
            <ul className="space-y-2.5" role="list">
              <li>
                <article className="flex items-center justify-between p-4 rounded-2xl bg-surface border border-border border-l-4 border-l-warning shadow-card cursor-pointer hover:bg-surface-hover hover:shadow-md active:scale-[0.99] transition-all group">
                  <div>
                    <span className="font-bold text-sm block group-hover:text-primary transition-colors">#1024 • Anu Sharma</span>
                    <span className="text-xs text-text-muted font-medium mt-0.5 block">Chocolate Truffle Cake (2 kg) • Today, 4:00 PM</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-sm block mb-1">₹1,800</span>
                    <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded flex items-center gap-1 bg-warning/15 text-warning border border-warning/20">
                      <Clock size={10} strokeWidth={3} /> IN PROGRESS
                    </span>
                  </div>
                </article>
              </li>
              <li>
                <article className="flex items-center justify-between p-4 rounded-2xl bg-surface border border-border border-l-4 border-l-success shadow-card cursor-pointer hover:bg-surface-hover hover:shadow-md active:scale-[0.99] transition-all group">
                  <div>
                    <span className="font-bold text-sm block group-hover:text-primary transition-colors">#1025 • Rahul Verma</span>
                    <span className="text-xs text-text-muted font-medium mt-0.5 block">Red Velvet Cupcakes (12 pcs) • Today, 5:30 PM</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-sm block mb-1">₹950</span>
                    <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded flex items-center gap-1 bg-success/10 text-success border border-success/20">
                      CONFIRMED
                    </span>
                  </div>
                </article>
              </li>
            </ul>
          </div>

          {/* Tomorrow Group */}
          <div className="mb-2">
            <h4 className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">
              Tomorrow
            </h4>
            <ul className="space-y-2.5" role="list">
              <li>
                <article className="flex items-center justify-between p-4 rounded-2xl bg-surface border border-border shadow-card cursor-pointer hover:bg-surface-hover hover:shadow-md active:scale-[0.99] transition-all group">
                  <div>
                    <span className="font-bold text-sm block group-hover:text-primary transition-colors">#1026 • Ananya Roy</span>
                    <span className="text-xs text-text-muted font-medium mt-0.5 block">Sourdough Bread (2 loaves) • Tomorrow, 10:00 AM</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-sm block mb-1">₹500</span>
                    <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded flex items-center gap-1 bg-success/10 text-success border border-success/20">
                      CONFIRMED
                    </span>
                  </div>
                </article>
              </li>
            </ul>
          </div>
        </section>

        {/* ============================================================
            Priority 4: Quick Actions
            ============================================================ */}
        <section aria-label="Quick actions">
          <h3 className="text-sm font-bold font-heading mb-4 text-text">
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Add Order", icon: ShoppingBag, color: "text-primary" },
              { label: "Add Customer", icon: Users, color: "text-secondary" },
              { label: "Add Stock", icon: Package, color: "text-warning" },
              { label: "Add Expense", icon: CircleDollarSign, color: "text-danger" },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  className="touch-target flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-surface border border-border hover:bg-surface-hover hover:border-primary/30 hover:shadow-md active:scale-95 transition-all shadow-sm group"
                >
                  <Icon size={24} strokeWidth={2} className={`${action.color} group-hover:scale-110 transition-transform`} />
                  <span className="text-xs font-bold">{action.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ============================================================
            Priority 5: Low Stock Alerts
            ============================================================ */}
        <section aria-label="Low stock alerts">
          <h3 className="text-sm font-bold font-heading mb-4 flex items-center gap-2 text-text">
            <Package size={18} className="text-warning" strokeWidth={2.5} />
            Low Stock Alerts
          </h3>
          <ul className="space-y-3" role="list">
            <li className="p-4 rounded-2xl bg-surface border border-border border-l-4 border-l-danger shadow-card group">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold tracking-wider text-danger uppercase mb-1 block flex items-center gap-1">
                    <AlertTriangle size={12} strokeWidth={3} /> Reorder Soon
                  </span>
                  <h4 className="font-bold text-sm">Unsalted Butter</h4>
                  <p className="text-xs text-text-muted font-medium mt-0.5">Current: 800g • Threshold: 2,000g</p>
                </div>
                <button className="touch-target px-4 py-2 text-xs font-bold rounded-xl bg-danger/10 text-danger hover:bg-danger hover:text-white active:scale-95 transition-all border border-danger/20 hover:border-danger">
                  + Stock
                </button>
              </div>
            </li>
          </ul>
        </section>

        {/* ============================================================
            Priority 6: Monthly Business Snapshot
            ============================================================ */}
        <section
          className="p-5 rounded-2xl bg-surface border border-border shadow-card"
          aria-label="Monthly business snapshot"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold font-heading flex items-center gap-2 text-text">
              <TrendingUp size={18} className="text-primary" strokeWidth={2.5} />
              This Month
            </h3>
            {/* Priority 7: View full analytics */}
            <button className="touch-target flex items-center gap-1 text-xs font-bold text-primary hover:text-primary-hover hover:underline transition-all">
              Analytics <ArrowRight size={14} strokeWidth={2.5} />
            </button>
          </div>
          
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-border">
              <dt className="text-text-muted font-medium">Revenue</dt>
              <dd className="font-bold text-success">₹52,400</dd>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <dt className="text-text-muted font-medium">Expenses</dt>
              <dd className="font-bold text-danger">₹18,200</dd>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <dt className="text-text-muted font-medium">Orders</dt>
              <dd className="font-bold">74</dd>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <dt className="text-text-muted font-medium">Avg Order</dt>
              <dd className="font-bold">₹708</dd>
            </div>
          </dl>
        </section>
      </div>

      <style>{`
        @keyframes wave {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(15deg); }
          75% { transform: rotate(-10deg); }
        }
        .animate-wave {
          animation: wave 1.5s ease-in-out infinite;
          display: inline-block;
        }
        
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </AppShell>
  );
}
