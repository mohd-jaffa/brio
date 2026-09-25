"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Clock, Plus, ShoppingBag } from "lucide-react";

import { AppShell } from "@/components/nav/AppShell";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ListScreen } from "@/components/ui/list-screen";
import { PageHeader } from "@/components/ui/page-header";
import { SearchInput } from "@/components/ui/search-input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { StatusPill } from "@/components/ui/status-pill";
import { UI_TEXT } from "@/constants/messages";
import type { Customer } from "@/features/customers/types";
import type { Order } from "@/features/orders/types";
import { byDueDate, isOpen, isOverdue, paymentPill, statusPill } from "@/features/orders/view";
import { formatPaise } from "@/lib/format/currency";
import { formatDateTime } from "@/lib/format/date";
import { apiRoutes } from "@/lib/query/keys";
import { useApiQuery } from "@/lib/query/useApiQuery";

type Tab = "ACTIVE" | "PAST";

const TABS = [
  { value: "ACTIVE" as const, label: "Active" },
  { value: "PAST" as const, label: "Past" },
];

export default function OrdersPage() {
  const [tab, setTab] = useState<Tab>("ACTIVE");
  const [search, setSearch] = useState("");

  const orders = useApiQuery<Order[]>(apiRoutes.orders.list);
  const customers = useApiQuery<Customer[]>(apiRoutes.customers.list);

  const nameOf = useMemo(() => {
    const names = new Map((customers.data ?? []).map((customer) => [customer.id, customer.name]));
    return (customerId: string) => names.get(customerId) ?? "Unknown customer";
  }, [customers.data]);

  const shown = useMemo(() => {
    const wanted = (orders.data ?? []).filter((order) => (tab === "ACTIVE" ? isOpen(order) : !isOpen(order)));
    const needle = search.trim().toLowerCase();
    const matching =
      needle === ""
        ? wanted
        : wanted.filter(
            (order) =>
              order.orderNumber.toLowerCase().includes(needle) ||
              nameOf(order.customerId).toLowerCase().includes(needle),
          );
    return byDueDate(matching, tab === "ACTIVE");
  }, [orders.data, tab, search, nameOf]);

  const settled = orders.data !== undefined && customers.data !== undefined;
  const query = {
    isLoading: orders.isLoading || customers.isLoading,
    error: orders.error ?? customers.error,
    isValidating: orders.isValidating || customers.isValidating,
    mutate: () => {
      void orders.mutate();
      void customers.mutate();
    },
  };

  const nothingMatches = settled && shown.length === 0 && (orders.data?.length ?? 0) > 0;

  return (
    <AppShell>
      <PageHeader title="Orders" subtitle="Manage your bakery orders">
        <LinkButton href="/orders/new" icon={Plus} label="Create Order" />
      </PageHeader>

      <div className="space-y-4">
        <SegmentedControl label="Which orders to show" value={tab} options={TABS} onChange={setTab} />
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by order number or customer"
        />
      </div>

      <ListScreen
        query={query}
        loadFailed="ORDERS_LOAD_FAILED"
        data={settled ? shown : undefined}
        keyOf={(order) => order.id}
        noMatches={
          nothingMatches
            ? search.trim() === ""
              ? `No ${tab.toLowerCase()} orders.`
              : UI_TEXT.states.noResults(search)
            : undefined
        }
        empty={
          <EmptyState
            icon={ShoppingBag}
            title="No orders yet"
            hint="When you receive an order, create it here to track inventory and revenue."
            action={
              <LinkButton
                href="/orders/new"
                icon={Plus}
                label="Create First Order"
                variant="secondary"
              />
            }
          />
        }
        renderItem={(order) => {
          const status = statusPill(order);
          const payment = paymentPill(order);
          const late = isOverdue(order);

          return (
            <Link href={`/orders/${order.id}`} className="group block">
              <article
                className={`rounded-2xl border p-4 shadow-sm transition-all hover:shadow-md active:scale-[0.99] ${
                  late ? "border-danger/30 bg-danger-bg/50" : "border-border bg-surface"
                }`}
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="mb-1 block text-sm font-bold leading-none text-text transition-colors group-hover:text-primary">
                      {order.orderNumber} • {nameOf(order.customerId)}
                    </h2>
                    <span
                      className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${
                        late ? "text-danger" : "text-text-muted"
                      }`}
                    >
                      <Clock size={10} strokeWidth={3} aria-hidden="true" />
                      Due {formatDateTime(order.delivery.date)}
                    </span>
                  </div>
                  <StatusPill label={status.label} tone={status.tone} />
                </div>

                <div className="flex items-end justify-between border-t border-border/50 pt-3">
                  <div className="space-y-1">
                    <span className="block text-xs font-medium text-text-muted">
                      {order.items.length} item{order.items.length === 1 ? "" : "s"}
                    </span>
                    <StatusPill label={payment.label} tone={payment.tone} />
                  </div>
                  <span className="font-heading text-lg font-bold text-text">
                    {formatPaise(order.pricing.total)}
                  </span>
                </div>
              </article>
            </Link>
          );
        }}
      />
    </AppShell>
  );
}
