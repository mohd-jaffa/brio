"use client";

import { Check, UserPlus, UserRound } from "lucide-react";
import { useState, type ReactNode } from "react";

import { UI_TEXT } from "@/constants/messages";
import { formatPhoneDigits } from "@/lib/phone";

import { Avatar } from "./avatar";
import { Button } from "./button";
import { cn } from "./cn";
import { SearchField } from "./search-field";
import { Sheet } from "./sheet";

export interface PickableCustomer {
  id: string;
  name: string;
  phone: string;
}

/** Who is chosen now: a Guest, or a customer by id. */
export type CustomerChoice = { kind: "GUEST" } | { kind: "CUSTOMER"; id: string };

/** What a tap hands back: a Guest, or the customer themself. */
export type PickedCustomer<T> = { kind: "GUEST" } | { kind: "CUSTOMER"; customer: T };

/** "98765 43210" or "+91 98765 43210" finds +919876543210 (BUG-23). */
function matches(customer: PickableCustomer, search: string): boolean {
  const words = search.trim().toLowerCase();
  if (words === "") return true;
  const digits = words.replace(/\D/g, "");
  return (
    customer.name.toLowerCase().includes(words) ||
    (digits.length > 0 && customer.phone.replace(/\D/g, "").includes(digits))
  );
}

/**
 * Who an order is for (plan §139.5, §139.11.3, §139.11.4): **Guest** pinned
 * first, one tap for a walk-in; then the business's customers, searched by
 * name or by phone in any format; and **Add new customer** at the foot. A
 * bottom sheet on a phone and a dialog from 768 px. Choosing closes it.
 *
 * The choices are a radio group: the current one is checked, and each is a
 * control a screen reader names by the customer's name and number.
 */
export function CustomerPicker<T extends PickableCustomer>({
  open,
  onClose,
  customers,
  value,
  onPick,
  onAddNew,
}: {
  open: boolean;
  onClose: () => void;
  customers: readonly T[];
  value: CustomerChoice | null;
  onPick: (picked: PickedCustomer<T>) => void;
  onAddNew: () => void;
}) {
  const text = UI_TEXT.customerPicker;
  const [search, setSearch] = useState("");
  const shown = customers.filter((customer) => matches(customer, search));

  // Each opening starts from the whole list.
  const close = () => {
    setSearch("");
    onClose();
  };

  const option = (picked: PickedCustomer<T>, leading: ReactNode, title: string, subtitle: string) => {
    const id = picked.kind === "GUEST" ? null : picked.customer.id;
    const checked = value !== null && (value.kind === "GUEST" ? id === null : value.id === id);
    return (
      <li key={id ?? "guest"}>
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
            setSearch("");
            onAddNew();
          }}
        />
      }
    >
      <div className="space-y-3 pb-2">
        <SearchField value={search} onChange={setSearch} placeholder={text.search} />
        <ul role="radiogroup" aria-label={text.title} className="space-y-1">
          {option(
            { kind: "GUEST" },
            <span
              aria-hidden="true"
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-sunken text-text-muted"
            >
              <UserRound size={20} strokeWidth={1.75} />
            </span>,
            text.guest,
            text.guestHint,
          )}
          {shown.map((customer) =>
            option(
              { kind: "CUSTOMER", customer },
              <Avatar name={customer.name} />,
              customer.name,
              `${UI_TEXT.fields.phonePrefix} ${formatPhoneDigits(customer.phone)}`,
            ),
          )}
        </ul>
        {shown.length === 0 && search.trim() !== "" && (
          <p role="status" className="px-3 py-2 text-sm text-text-muted">
            {text.noMatches}
          </p>
        )}
      </div>
    </Sheet>
  );
}
