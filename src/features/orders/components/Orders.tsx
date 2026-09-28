"use client";

import { useState } from "react";

import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Fab } from "@/components/ui/fab";
import { ListScreen } from "@/components/ui/list-screen";
import { PageHeader } from "@/components/ui/page-header";
import { RowList } from "@/components/ui/row";
import { SearchField } from "@/components/ui/search-field";
import { TabPanel, Tabs } from "@/components/ui/tabs";
import { UI_TEXT } from "@/constants/messages";
import { ORDER_STATUS_LABELS, ORDER_TABS, type OrderTab } from "@/constants/statuses";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { apiRoutes, withQuery } from "@/lib/query/keys";
import { useApiPages } from "@/lib/query/useApiPages";
import { useApiQuery } from "@/lib/query/useApiQuery";

import type { OrderCounts, OrderListItem } from "../types";
import { anyFilter, OrderFilterSheet, type OrderFilters } from "./OrderFilterSheet";
import { OrderRow } from "./OrderRow";
import { OrdersTable } from "./OrdersTable";

/**
 * Orders (plan §139.10): a tab for every status with how many it holds,
 * search by number, customer or phone, and filters for when they are due, how
 * they are paid, and Guest orders — all worked out on the server, a page at a
 * time (§133.9 I4). Rows up to 1280 px, and a table from there, where its
 * six columns have room.
 */
export function Orders() {
  const text = UI_TEXT.ordersScreen;
  const [tab, setTab] = useState<OrderTab>("ALL");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<OrderFilters>({});
  const [choosing, setChoosing] = useState(false);
  // The clock is read once, when the list opens: every row agrees on what is overdue.
  const [now] = useState(() => new Date());
  const searched = useDebouncedValue(search.trim());

  const narrowing = {
    search: searched,
    customer: filters.guest ? "guest" : undefined,
    payment: filters.payment,
    from: filters.from,
    to: filters.to,
  };
  const orders = useApiPages<OrderListItem>(
    withQuery(apiRoutes.orders.list, { ...narrowing, status: tab === "ALL" ? undefined : tab }),
  );
  const counts = useApiQuery<OrderCounts>(withQuery(apiRoutes.orders.counts, narrowing), { keepPreviousData: true });

  const filtered = anyFilter(filters);
  // With nothing narrowing it, an empty All tab means no orders yet; anything else, none here.
  const narrowed = searched !== "" || filtered || tab !== "ALL";

  return (
    <div className="space-y-4">
      <PageHeader title={text.title} subtitle={text.subtitle}>
        <Fab label={text.newOrder} href="/orders/new" />
      </PageHeader>

      <SearchField
        value={search}
        onChange={setSearch}
        placeholder={text.search}
        filter={{ label: text.filter, onClick: () => setChoosing(true), active: filtered }}
      />

      <Tabs
        id="orders"
        label={text.tabs}
        value={tab}
        onChange={setTab}
        options={ORDER_TABS.map((value) => ({
          value,
          label: value === "ALL" ? text.all : ORDER_STATUS_LABELS[value],
          count: counts.data?.[value],
        }))}
      />

      <TabPanel id="orders" value={tab}>
        <ListScreen
          query={orders}
          loadFailed="ORDERS_LOAD_FAILED"
          data={orders.data}
          noMatches={narrowed ? (searched ? UI_TEXT.states.noResults(searched) : text.noneHere) : undefined}
          empty={
            <EmptyState
              art="clipboard"
              title={text.emptyTitle}
              hint={text.emptyHint}
              action={<LinkButton href="/orders/new" label={text.newOrder} variant="secondary" />}
            />
          }
          renderList={(items) => (
            <>
              <RowList label={text.title} className="xl:hidden">
                {items.map((order) => (
                  <OrderRow key={order.id} order={order} now={now} />
                ))}
              </RowList>
              <div className="hidden xl:block">
                <OrdersTable orders={items} now={now} />
              </div>
            </>
          )}
        />
      </TabPanel>

      <OrderFilterSheet
        open={choosing}
        value={filters}
        onClose={() => setChoosing(false)}
        onApply={setFilters}
      />
    </div>
  );
}
