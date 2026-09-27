"use client";

import { Mail, MapPin, MessageCircle, Pencil, Phone, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Button, LinkButton } from "@/components/ui/button";
import { ListScreen, LoadFailed } from "@/components/ui/list-screen";
import { PageHeader } from "@/components/ui/page-header";
import { RowList } from "@/components/ui/row";
import { SkeletonRows } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/ui/status-pill";
import { TabPanel, Tabs } from "@/components/ui/tabs";
import { UI_TEXT } from "@/constants/messages";
import { CUSTOMER_SEGMENT_TONES } from "@/constants/statuses";
import { useAuth } from "@/features/auth/AuthProvider";
import { OrderRow } from "@/features/orders/components/OrderRow";
import { chooseCustomer, customerForDraft } from "@/features/orders/draft";
import { useOrderDraft } from "@/features/orders/hooks/useOrderDraft";
import type { OrderListItem } from "@/features/orders/types";
import { useDisclosure } from "@/hooks/useDisclosure";
import { dayKey } from "@/lib/dates/calendar";
import { formatPaise } from "@/lib/format/currency";
import { formatDayMonth, formatMonth } from "@/lib/format/date";
import { callHref, formatPhoneDigits, whatsAppHref } from "@/lib/phone";
import { apiRoutes, withQuery } from "@/lib/query/keys";
import { useApiPages } from "@/lib/query/useApiPages";
import { useApiQuery } from "@/lib/query/useApiQuery";

import type { Customer, CustomerSummary } from "../types";
import { CustomerFormSheet } from "./CustomerFormSheet";

const TABS = ["ORDERS", "NOTES", "ADDRESSES"] as const;
type Tab = (typeof TABS)[number];

const CARD = "rounded-2xl border border-border bg-surface p-4 shadow-card";
const QUIET = "rounded-2xl border border-border bg-surface px-4 py-6 text-center text-sm text-text-muted shadow-card";

/**
 * One customer (plan §139.10, R5.4): who they are — their initials, segment,
 * phone, email and address — with Call, WhatsApp, Map and Edit; what they
 * have meant to the business — orders, spend, since when, and what they still
 * owe; then their orders a page at a time, the notes kept on them, and the
 * places their deliveries went. **Create order** starts the order being built
 * with them already chosen, keeping whatever it holds (IMP-04).
 */
export function CustomerDetail({ id }: { id: string }) {
  const text = UI_TEXT.customerDetail;
  const router = useRouter();
  const { profile } = useAuth();
  const { update } = useOrderDraft(profile?.id ?? null);
  const form = useDisclosure<Customer>();
  const [tab, setTab] = useState<Tab>("ORDERS");
  const [now] = useState(() => new Date());

  const customer = useApiQuery<Customer>(apiRoutes.customers.detail(id));
  const summary = useApiQuery<CustomerSummary>(apiRoutes.customers.summary(id));
  const orders = useApiPages<OrderListItem>(withQuery(apiRoutes.orders.list, { customer: id }));

  if (!customer.data) {
    return customer.error ? (
      <div className="space-y-4">
        <PageHeader title={text.title} back="/customers" />
        <LoadFailed query={customer} loadFailed="CUSTOMER_LOAD_FAILED" />
      </div>
    ) : (
      <div role="status" aria-busy="true" aria-label={text.loading}>
        <SkeletonRows rows={3} height="h-32" />
      </div>
    );
  }

  const person = customer.data;
  const stats = summary.data;
  const createOrder = () => {
    update((draft) => chooseCustomer(draft, customerForDraft(person)));
    router.push("/orders/new");
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <PageHeader title={person.name} back="/customers">
        <Button
          label={text.edit}
          aria-label={text.editName(person.name)}
          icon={Pencil}
          variant="secondary"
          size="sm"
          onClick={() => form.open(person)}
        />
        <span className="hidden lg:inline-flex">
          <Button label={text.createOrder} icon={Plus} variant="action" onClick={createOrder} />
        </span>
      </PageHeader>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start">
        <div className="space-y-4">
          <section aria-label={text.about} className={`${CARD} space-y-4`}>
            <div className="flex items-start gap-4">
              <Avatar name={person.name} size="lg" />
              <div className="min-w-0 flex-1 space-y-1.5 text-sm">
                {stats?.segment && (
                  <StatusPill label={UI_TEXT.segments[stats.segment]} tone={CUSTOMER_SEGMENT_TONES[stats.segment]} />
                )}
                <p className="flex items-center gap-2 tabular-nums text-text">
                  <Phone size={15} strokeWidth={1.75} className="shrink-0 text-text-muted" aria-hidden="true" />
                  {/* Plain text to read and copy; Call, just below, dials it. */}
                  <span>
                    {UI_TEXT.fields.phonePrefix} {formatPhoneDigits(person.phone)}
                  </span>
                </p>
                {person.email && (
                  <p className="flex items-center gap-2 text-text">
                    <Mail size={15} strokeWidth={1.75} className="shrink-0 text-text-muted" aria-hidden="true" />
                    {/* The address is cut short inside the link, so its tap is not. */}
                    <a href={`mailto:${person.email}`} className="hit-area-line min-w-0 rounded hover:underline">
                      <span className="block truncate">{person.email}</span>
                    </a>
                  </p>
                )}
                {person.address && (
                  <p className="flex items-start gap-2 text-text">
                    <MapPin size={15} strokeWidth={1.75} className="mt-0.5 shrink-0 text-text-muted" aria-hidden="true" />
                    <span className="min-w-0 whitespace-pre-line break-words">{person.address}</span>
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 [&>*]:flex-1">
              <LinkButton
                href={callHref(person.phone)}
                label={text.call}
                accessibleName={text.callName(person.name)}
                icon={Phone}
                variant="secondary"
                size="sm"
              />
              <LinkButton
                href={whatsAppHref(person.phone)}
                label={text.whatsApp}
                accessibleName={text.whatsAppName(person.name)}
                icon={MessageCircle}
                variant="secondary"
                size="sm"
                newTab
              />
              {person.googleMapsLink && (
                <LinkButton
                  href={person.googleMapsLink}
                  label={text.map}
                  accessibleName={text.mapName(person.name)}
                  icon={MapPin}
                  variant="secondary"
                  size="sm"
                  newTab
                />
              )}
            </div>
          </section>

          {stats ? (
            <dl className={`${CARD} grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-2`}>
              {[
                // What they still owe leads: it is what needs doing (the user, 2026-09-27).
                { label: text.balanceDue, value: formatPaise(stats.balanceDue) },
                { label: text.totalOrders, value: String(stats.orders) },
                { label: text.totalSpent, value: formatPaise(stats.spent) },
                { label: text.since, value: formatMonth(dayKey(person.createdAt)) },
              ].map((figure) => (
                // The figure reads first, as the reference sets it; the label still comes first to a screen reader.
                <div key={figure.label} className="flex min-w-0 flex-col-reverse gap-0.5">
                  <dt className="text-xs text-text-muted">{figure.label}</dt>
                  <dd className="truncate font-heading text-xl font-medium tabular-nums text-text">{figure.value}</dd>
                </div>
              ))}
            </dl>
          ) : summary.error ? (
            <LoadFailed query={summary} loadFailed="CUSTOMER_LOAD_FAILED" />
          ) : (
            <div role="status" aria-busy="true" aria-label={text.loading}>
              <SkeletonRows rows={2} height="h-24" />
            </div>
          )}
        </div>

        <div className="min-w-0 space-y-4">
          <Tabs
            id="customer"
            label={text.about}
            value={tab}
            onChange={setTab}
            options={TABS.map((value) => ({ value, label: text.tabNames[value] }))}
          />
          <TabPanel id="customer" value={tab}>
            {tab === "ORDERS" && (
              <ListScreen
                query={orders}
                loadFailed="ORDERS_LOAD_FAILED"
                data={orders.data}
                empty={<p className={QUIET}>{text.noOrders}</p>}
                renderList={(items) => (
                  <RowList label={text.ordersList(person.name)}>
                    {items.map((order) => (
                      <OrderRow key={order.id} order={order} now={now} showCustomer={false} />
                    ))}
                  </RowList>
                )}
              />
            )}
            {tab === "NOTES" && (
              <section className={`${CARD} space-y-3`}>
                <p className="text-xs text-text-muted">{text.notesHint}</p>
                <p className="whitespace-pre-line break-words text-sm text-text">{person.notes ?? text.noNotes}</p>
                <Button label={text.editNotes} icon={Pencil} variant="ghost" size="sm" onClick={() => form.open(person)} />
              </section>
            )}
            {tab === "ADDRESSES" &&
              (!stats ? (
                <SkeletonRows rows={2} height="h-16" />
              ) : stats.addresses.length === 0 ? (
                <p className={QUIET}>{text.noAddresses}</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-text-muted">{text.addressesHint}</p>
                  <RowList label={text.tabNames.ADDRESSES}>
                    {stats.addresses.map((place) => (
                      <li key={`${place.address}|${place.googleMapsLink ?? ""}`} className="flex items-start gap-3 px-4 py-3">
                        <MapPin size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-text-muted" aria-hidden="true" />
                        <div className="min-w-0 flex-1">
                          <p className="whitespace-pre-line break-words text-sm font-medium text-text">
                            {place.address || text.mapOnly}
                          </p>
                          <p className="mt-0.5 text-xs text-text-muted">
                            {text.lastUsed(formatDayMonth(dayKey(place.lastUsed)))}
                          </p>
                        </div>
                        {place.googleMapsLink && (
                          <LinkButton
                            href={place.googleMapsLink}
                            label={text.map}
                            accessibleName={`${text.map}: ${place.address || text.mapOnly}`}
                            icon={MapPin}
                            variant="ghost"
                            size="sm"
                            newTab
                          />
                        )}
                      </li>
                    ))}
                  </RowList>
                </div>
              ))}
          </TabPanel>
        </div>
      </div>

      <div className="sticky bottom-[calc(var(--nav-height)+var(--safe-bottom)+0.75rem)] z-20 md:bottom-6 lg:hidden">
        <Button
          label={text.createOrder}
          aria-label={text.createOrderName(person.name)}
          icon={Plus}
          variant="action"
          size="lg"
          fullWidth
          onClick={createOrder}
        />
      </div>

      <CustomerFormSheet
        isOpen={form.isOpen}
        onClose={form.close}
        onSuccess={() => {
          void customer.mutate();
          void summary.mutate();
        }}
        initialData={form.subject}
      />
    </div>
  );
}
