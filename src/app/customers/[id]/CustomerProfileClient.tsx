"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import {
  ArrowLeft,
  Clock,
  CreditCard,
  Edit2,
  FileText,
  Mail,
  MapPin,
  Phone,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";

import { AppShell } from "@/components/nav/AppShell";
import { Button } from "@/components/ui/button";
import { ScreenNotice } from "@/components/ui/screen-notice";
import { SkeletonRows } from "@/components/ui/skeleton";
import { StatTile } from "@/components/ui/stat-tile";
import { StatusBadge } from "@/components/ui/status-badge";
import { CustomerFormSheet } from "@/features/customers/components/CustomerFormSheet";
import type { Customer } from "@/features/customers/types";
import type { Order } from "@/features/orders/types";
import { balanceDue, statusBadge } from "@/features/orders/view";
import { useDisclosure } from "@/hooks/useDisclosure";
import { dayKey } from "@/lib/dates/calendar";
import { formatPaise } from "@/lib/format/currency";
import { formatDate } from "@/lib/format/date";
import { sumPaise } from "@/lib/money";
import { apiRoutes } from "@/lib/query/keys";
import { useApiQuery } from "@/lib/query/useApiQuery";

const RECENT_ORDER_COUNT = 5;

interface CustomerTrade {
  totalOrders: number;
  /** All in whole paise. */
  totalSpent: number;
  pendingPayments: number;
  avgOrder: number;
}

/** What this customer is worth to the bakery. Cancelled orders count for nothing. */
function trade(orders: readonly Order[]): CustomerTrade {
  const counted = orders.filter((order) => order.status !== "CANCELLED");
  const totalSpent = sumPaise(counted.map((order) => order.pricing.total));

  return {
    totalOrders: counted.length,
    totalSpent,
    pendingPayments: sumPaise(counted.map(balanceDue)),
    avgOrder: counted.length === 0 ? 0 : Math.round(totalSpent / counted.length),
  };
}

/** One line of the details list — an email, an address, a note. */
function Detail({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Mail;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-3">
      <Icon size={16} className="mt-0.5 shrink-0 text-text-muted" aria-hidden="true" />
      <div className="min-w-0">
        <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wider text-text-muted">
          {label}
        </span>
        <span className="text-sm font-medium leading-relaxed">{children}</span>
      </div>
    </li>
  );
}

export function CustomerProfileClient({ id }: { id: string }) {
  const router = useRouter();
  const form = useDisclosure<Customer>();

  const customer = useApiQuery<Customer>(apiRoutes.customers.detail(id));
  const orders = useApiQuery<Order[]>(apiRoutes.orders.list);

  const theirs = useMemo(
    () =>
      (orders.data ?? [])
        .filter((order) => order.customerId === id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [orders.data, id],
  );
  const metrics = useMemo(() => trade(theirs), [theirs]);

  if (customer.error) {
    return (
      <AppShell>
        <ScreenNotice>That customer could not be loaded.</ScreenNotice>
        <Button label="Go back" icon={ArrowLeft} variant="secondary" onClick={() => router.back()} />
      </AppShell>
    );
  }

  if (!customer.data) {
    return (
      <AppShell>
        <div role="status" aria-busy="true" aria-label="Loading customer">
          <SkeletonRows rows={2} height="h-40" />
        </div>
      </AppShell>
    );
  }

  const person = customer.data;

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <Button label="Back" icon={ArrowLeft} variant="ghost" onClick={() => router.back()} />
        <Button label="Edit" icon={Edit2} variant="secondary" onClick={() => form.open(person)} />
      </div>

      <section className="relative flex flex-col items-center overflow-hidden rounded-3xl border border-border bg-surface p-6 text-center shadow-card">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-primary/10 to-transparent"
        />
        <div
          aria-hidden="true"
          className="z-10 mb-4 flex h-20 w-20 items-center justify-center rounded-full border-4 border-background bg-primary/15 font-heading text-3xl font-bold text-primary shadow-sm"
        >
          {person.name.charAt(0).toUpperCase()}
        </div>

        <h1 className="z-10 mb-1 font-heading text-2xl font-bold text-text">{person.name}</h1>
        <p className="z-10 mb-6 flex items-center gap-2 text-sm font-medium text-text-muted">
          <Phone size={14} aria-hidden="true" /> {person.phone}
        </p>

        <div className="flex w-full gap-3">
          <a
            href={`tel:${person.phone}`}
            className="touch-target flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-text shadow-md transition-all active:scale-[0.98]"
          >
            <Phone size={16} strokeWidth={2.5} aria-hidden="true" /> Call
          </a>
          {person.googleMapsLink && (
            <a
              href={person.googleMapsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="touch-target flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-background py-3 text-sm font-bold text-text shadow-sm transition-all hover:bg-surface-hover active:scale-[0.98]"
            >
              <MapPin size={16} strokeWidth={2.5} aria-hidden="true" /> Directions
            </a>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 shadow-card">
        <h2 className="mb-4 flex items-center gap-2 font-heading text-sm font-bold text-text">
          <TrendingUp size={18} strokeWidth={2.5} className="text-secondary" aria-hidden="true" />
          Customer Analytics
        </h2>
        <dl className="grid grid-cols-2 gap-3">
          <StatTile label="Total Orders" value={String(metrics.totalOrders)} icon={ShoppingBag} />
          <StatTile
            label="Total Spent"
            value={formatPaise(metrics.totalSpent)}
            tone="success"
            icon={CreditCard}
          />
          <StatTile label="Avg Order" value={formatPaise(metrics.avgOrder)} />
          <StatTile label="Pending" value={formatPaise(metrics.pendingPayments)} tone="danger" />
        </dl>
      </section>

      {(person.email || person.address || person.notes) && (
        <section className="rounded-2xl border border-border bg-surface p-5 shadow-card">
          <h2 className="mb-4 flex items-center gap-2 font-heading text-sm font-bold text-text">
            <FileText size={18} strokeWidth={2.5} className="text-primary" aria-hidden="true" />
            Details
          </h2>
          <ul role="list" className="space-y-4">
            {person.email && (
              <Detail icon={Mail} label="Email">
                {person.email}
              </Detail>
            )}
            {person.address && (
              <Detail icon={MapPin} label="Address">
                {person.address}
              </Detail>
            )}
            {person.notes && (
              <Detail icon={FileText} label="Baker Notes">
                {person.notes}
              </Detail>
            )}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-4 flex items-center gap-2 font-heading text-sm font-bold text-text">
          <Clock size={18} strokeWidth={2.5} className="text-primary" aria-hidden="true" />
          Recent Orders
        </h2>

        {orders.error && orders.data === undefined ? (
          <ScreenNotice>Could not load this customer&rsquo;s orders.</ScreenNotice>
        ) : orders.data === undefined ? (
          <SkeletonRows rows={2} height="h-16" />
        ) : theirs.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-surface p-6 text-center text-sm font-medium text-text-muted">
            No orders yet for this customer.
          </p>
        ) : (
          <ul role="list" className="space-y-3">
            {theirs.slice(0, RECENT_ORDER_COUNT).map((order) => {
              const badge = statusBadge(order);
              return (
                <li key={order.id}>
                  <Link href={`/orders/${order.id}`} className="group block">
                    <article className="flex items-center justify-between rounded-2xl border border-border bg-surface p-4 shadow-sm transition-all hover:bg-surface-hover hover:shadow-md active:scale-[0.99]">
                      <div>
                        <span className="block text-sm font-bold transition-colors group-hover:text-primary">
                          {order.orderNumber}
                        </span>
                        <span className="mt-0.5 block text-xs font-medium text-text-muted">
                          {formatDate(dayKey(order.createdAt))}
                        </span>
                      </div>
                      <div className="space-y-1 text-right">
                        <span className="block text-sm font-bold">{formatPaise(order.pricing.total)}</span>
                        <StatusBadge label={badge.label} tone={badge.tone} />
                      </div>
                    </article>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <CustomerFormSheet
        isOpen={form.isOpen}
        onClose={form.close}
        onSuccess={() => customer.mutate()}
        initialData={form.subject}
      />
    </AppShell>
  );
}
