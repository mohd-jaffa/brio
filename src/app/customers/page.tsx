"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight, Plus, Users } from "lucide-react";

import { AppShell } from "@/components/nav/AppShell";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ListScreen } from "@/components/ui/list-screen";
import { PageHeader } from "@/components/ui/page-header";
import { SearchInput } from "@/components/ui/search-input";
import { UI_TEXT } from "@/constants/messages";
import { CustomerFormSheet } from "@/features/customers/components/CustomerFormSheet";
import type { Customer } from "@/features/customers/types";
import { useDisclosure } from "@/hooks/useDisclosure";
import { apiRoutes } from "@/lib/query/keys";
import { useApiQuery } from "@/lib/query/useApiQuery";

/** A customer matches a search on either the name or the number a baker dials. */
function matches(customer: Customer, term: string): boolean {
  const needle = term.trim().toLowerCase();
  return needle === "" || customer.name.toLowerCase().includes(needle) || customer.phone.includes(needle);
}

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const form = useDisclosure<Customer>();
  const query = useApiQuery<Customer[]>(apiRoutes.customers.list);

  const shown = query.data?.filter((customer) => matches(customer, search));
  const searchedInVain = Boolean(query.data?.length) && shown?.length === 0;

  return (
    <AppShell>
      <PageHeader title="Customers" subtitle="Manage your bakery&rsquo;s clients">
        <Button icon={Plus} label="Add Customer" onClick={() => form.open()} />
      </PageHeader>

      <SearchInput value={search} onChange={setSearch} placeholder="Search by name or phone" />

      <ListScreen
        query={query}
        loadFailed="CUSTOMERS_LOAD_FAILED"
        data={shown}
        keyOf={(customer) => customer.id}
        noMatches={searchedInVain ? UI_TEXT.states.noResults(search) : undefined}
        empty={
          <EmptyState
            icon={Users}
            title="No customers yet"
            hint="Start adding your customers to track their orders and preferences."
            action={
              <Button
                icon={Plus}
                label="Add Your First Customer"
                variant="secondary"
                onClick={() => form.open()}
              />
            }
          />
        }
        renderItem={(customer) => (
          <Link href={`/customers/${customer.id}`} className="group block">
            <article className="flex items-center justify-between rounded-2xl border border-border bg-surface p-4 shadow-sm transition-all hover:bg-surface-hover hover:shadow-md active:scale-[0.99]">
              <div className="flex items-center gap-4">
                <div
                  aria-hidden="true"
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 font-heading text-lg font-bold text-primary"
                >
                  {customer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <span className="block text-base font-bold text-text transition-colors group-hover:text-primary">
                    {customer.name}
                  </span>
                  <span className="mt-0.5 block text-xs font-medium text-text-muted">
                    {customer.phone}
                  </span>
                </div>
              </div>
              <ChevronRight
                size={20}
                aria-hidden="true"
                className="text-text-muted/40 transition-colors group-hover:text-primary"
              />
            </article>
          </Link>
        )}
      />

      <CustomerFormSheet
        isOpen={form.isOpen}
        onClose={form.close}
        onSuccess={() => query.mutate()}
        initialData={form.subject}
      />
    </AppShell>
  );
}
