"use client";

import { Check, UserPlus } from "lucide-react";
import type { ReactNode } from "react";

import { UI_TEXT } from "@/constants/messages";
import { formatPhoneDigits } from "@/lib/phone";

import { Avatar } from "./avatar";
import { Button } from "./button";
import { cn } from "./cn";
import { GuestMark } from "./guest-mark";
import { SearchField } from "./search-field";
import { Sheet } from "./sheet";
import { SkeletonRows } from "./skeleton";

export interface PickableCustomer {
  id: string;
  name: string;
  phone: string;
}

/** Who is chosen now: a Guest, or a customer by id. */
export type CustomerChoice = { kind: "GUEST" } | { kind: "CUSTOMER"; id: string };

/** What a tap hands back: a Guest, or the customer themself. */
export type PickedCustomer<T> = { kind: "GUEST" } | { kind: "CUSTOMER"; customer: T };

/**
 * Who an order is for (plan §139.5, §139.11.3, §139.11.4): **Guest** pinned
 * first, one tap for a walk-in; then the business's customers, searched by
 * name or by phone in any format; and **Add new customer** at the foot. A
 * bottom sheet on a phone and a dialog from 768 px. Choosing closes it.
 *
 * The search runs on the server and the customers come a page at a time
 * (§133.9 I4): the screen holds the search and hands in what matched, with
 * **Show more** while another page follows.
 *
 * The choices are a radio group: the current one is checked, and each is a
 * control a screen reader names by the customer's name and number.
 */
export function CustomerPicker<T extends PickableCustomer>({
  open,
  onClose,
  customers,
  search,
  onSearch,
  more,
  value,
  onPick,
  onAddNew,
}: {
  open: boolean;
  onClose: () => void;
  /** Those matching the search so far; undefined until the first page comes. */
  customers: readonly T[] | undefined;
  search: string;
  onSearch: (search: string) => void;
  /** Whether another page follows, and how to ask for it. */
  more: { hasMore: boolean; loadingMore: boolean; loadMore: () => void };
  value: CustomerChoice | null;
  onPick: (picked: PickedCustomer<T>) => void;
  onAddNew: () => void;
}) {
  const text = UI_TEXT.customerPicker;

  // Each opening starts from the whole list.
  const close = () => {
    onSearch("");
    onClose();
  };

  const option = (picked: PickedCustomer<T>, leading: ReactNode, title: string, subtitle: string) => {
    const id = picked.kind === "GUEST" ? null : picked.customer.id;
    const checked = value !== null && (value.kind === "GUEST" ? id === null : value.id === id);
    return (
      <li key={id ?? "guest"} role="none">
        <button
          type="button"
          role="radio"
          aria-checked={checked}
          onClick={() => {
            onPick(picked);
            close();
          }}
          className={cn(
            "focus-inset flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-surface-hover",
            checked && "bg-primary-soft",
          )}
        >
          {leading}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-text">{title}</span>
            <span className="block truncate text-sm text-text-muted">{subtitle}</span>
          </span>
          <span
            aria-hidden="true"
            className={cn(
              "inline-flex size-6 shrink-0 items-center justify-center rounded-full border",
              checked ? "border-primary bg-primary text-primary-text" : "border-border",
            )}
          >
            {checked && <Check size={14} strokeWidth={2.5} />}
          </span>
        </button>
      </li>
    );
  };

  return (
    <Sheet
      open={open}
      onClose={close}
      title={text.title}
      footer={
        <Button
          label={text.addNew}
          icon={UserPlus}
          variant="secondary"
          fullWidth
          onClick={() => {
            onSearch("");
            onAddNew();
          }}
        />
      }
    >
      <div className="space-y-3 pb-2">
        <SearchField value={search} onChange={onSearch} placeholder={text.search} />
        <ul role="radiogroup" aria-label={text.title} className="space-y-1">
          {option({ kind: "GUEST" }, <GuestMark />, text.guest, text.guestHint)}
          {customers?.map((customer) =>
            option(
              { kind: "CUSTOMER", customer },
              <Avatar name={customer.name} />,
              customer.name,
              `${UI_TEXT.fields.phonePrefix} ${formatPhoneDigits(customer.phone)}`,
            ),
          )}
        </ul>
        {customers === undefined ? (
          <div role="status" aria-busy="true" aria-label={text.loading}>
            <SkeletonRows rows={3} height="h-14" />
          </div>
        ) : (
          customers.length === 0 &&
          search.trim() !== "" && (
            <p role="status" className="px-3 py-2 text-sm text-text-muted">
              {text.noMatches}
            </p>
          )
        )}
        {more.hasMore && (
          <div className="flex justify-center">
            <Button label={UI_TEXT.actions.showMore} variant="ghost" size="sm" loading={more.loadingMore} onClick={more.loadMore} />
          </div>
        )}
      </div>
    </Sheet>
  );
}
