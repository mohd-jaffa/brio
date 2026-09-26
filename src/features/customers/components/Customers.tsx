"use client";

import { Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Fab } from "@/components/ui/fab";
import { GuestMark } from "@/components/ui/guest-mark";
import { ListScreen } from "@/components/ui/list-screen";
import { PageHeader } from "@/components/ui/page-header";
import { Row, RowList } from "@/components/ui/row";
import { SearchField } from "@/components/ui/search-field";
import { StatusPill } from "@/components/ui/status-pill";
import { TabPanel, Tabs } from "@/components/ui/tabs";
import { UI_TEXT } from "@/constants/messages";
import { DATE_RANGE_LABELS } from "@/constants/ranges";
import { CUSTOMER_SEGMENT_TONES, CUSTOMER_SEGMENTS, type CustomerSegment } from "@/constants/statuses";
import type { OrderListItem } from "@/features/orders/types";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useDisclosure } from "@/hooks/useDisclosure";
import { useRememberedRange } from "@/hooks/useRememberedRange";
import { formatPaise } from "@/lib/format/currency";
import { formatDayMonth, formatDaysAgo } from "@/lib/format/date";
import { apiRoutes, withQuery } from "@/lib/query/keys";
import { useApiPages } from "@/lib/query/useApiPages";

import type { CustomerListItem, GuestSales } from "../types";
import { CustomerFormSheet } from "./CustomerFormSheet";

type Tab = "ALL" | CustomerSegment;
const TABS: readonly Tab[] = ["ALL", ...CUSTOMER_SEGMENTS];

/**
 * The pinned Guest sales row (plan §139.10, §139.11.3): how many orders
 * Guests placed and what they came to, over the period Guest sales was last
 * read for on this device — the same request, so opening it shows the same
 * figures at once.
 */
function GuestSalesRow() {
  const text = UI_TEXT.customersScreen;
  const [range] = useRememberedRange("guest-sales");
  const custom = range.preset === "CUSTOM";
  const sales = useApiPages<OrderListItem, GuestSales>(
    custom && (!range.from || !range.to)
      ? null
      : withQuery(apiRoutes.guestSales, {
          range: range.preset,
          from: custom ? range.from : undefined,
          to: custom ? range.to : undefined,
        }),
  );
  const summary = sales.first;
  const period = summary
    ? custom
      ? `${formatDayMonth(summary.period.from)} – ${formatDayMonth(summary.period.to)}`
      : DATE_RANGE_LABELS[range.preset]
    : undefined;

  return (
    <RowList label={text.guestSalesList}>
      <Row
        href="/customers/guest"
        leading={<GuestMark />}
        title={text.guestSales}
        subtitle={
          summary && period
            ? text.guestSalesLine(text.orders(summary.orders), formatPaise(summary.sales), period)
            : UI_TEXT.states.loading
        }
      />
    </RowList>
  );
}

/** One customer as the list shows them: initials, name, orders and when they last ordered, and their segment. */
function CustomerRow({ customer, now }: { customer: CustomerListItem; now: Date }) {
  const text = UI_TEXT.customersScreen;
  return (
    <Row
      href={`/customers/${customer.id}`}
      leading={<Avatar name={customer.name} />}
      title={
        // The pill sits by the name, so the line under it has the row's width for when they last ordered.
        <span className="flex items-center gap-2">
          <span className="min-w-0 truncate">{customer.name}</span>
          {customer.segment && (
            <StatusPill label={UI_TEXT.segments[customer.segment]} tone={CUSTOMER_SEGMENT_TONES[customer.segment]} />
          )}
        </span>
      }
      subtitle={
        customer.lastOrderAt
          ? `${text.orders(customer.orders)} · ${text.lastOrder(formatDaysAgo(customer.lastOrderAt, now))}`
          : text.noOrders
      }
    />
  );
}

/**
 * Customers (plan §139.10, R5.3): All, Regular and New, worked out from
 * their orders; the pinned Guest sales row; search by name, or by phone
 * however it is typed (BUG-23); and **+** for a new customer, whose screen
 * opens once they are saved — all read from the server a page at a time
 * (§133.9 I4).
 */
export function Customers() {
  const text = UI_TEXT.customersScreen;
  const [tab, setTab] = useState<Tab>("ALL");
  const [search, setSearch] = useState("");
  const [now] = useState(() => new Date());
  const router = useRouter();
  const form = useDisclosure();
  const searched = useDebouncedValue(search.trim());

  const customers = useApiPages<CustomerListItem>(
    withQuery(apiRoutes.customers.list, { segment: tab === "ALL" ? undefined : tab, search: searched }),
  );

  return (
    <div className="space-y-4">
      <PageHeader title={text.title} subtitle={text.subtitle}>
        <Fab label={text.newCustomer} onClick={() => form.open()} />
      </PageHeader>

      <SearchField value={search} onChange={setSearch} placeholder={text.search} />

      <Tabs
        id="customers"
        label={text.tabs}
        value={tab}
        onChange={setTab}
        options={TABS.map((value) => ({ value, label: text.tabNames[value] }))}
      />

      <TabPanel id="customers" value={tab}>
        <div className="space-y-4">
          {tab === "ALL" && searched === "" && <GuestSalesRow />}
          <ListScreen
            query={customers}
            loadFailed="CUSTOMERS_LOAD_FAILED"
            data={customers.data}
            noMatches={
              searched ? UI_TEXT.states.noResults(searched) : tab === "ALL" ? undefined : text.noneInSegment[tab]
            }
            empty={
              <EmptyState
                icon={Users}
                title={text.emptyTitle}
                hint={text.emptyHint}
                action={<Button label={text.newCustomer} variant="secondary" onClick={() => form.open()} />}
              />
            }
            renderList={(items) => (
              <RowList label={text.list}>
                {items.map((customer) => (
                  <CustomerRow key={customer.id} customer={customer} now={now} />
                ))}
              </RowList>
            )}
          />
        </div>
      </TabPanel>

      <CustomerFormSheet
        isOpen={form.isOpen}
        onClose={form.close}
        onSuccess={(customer) => router.push(`/customers/${customer.id}`)}
      />
    </div>
  );
}
