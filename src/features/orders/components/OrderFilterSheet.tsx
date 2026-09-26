"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ChoiceChips } from "@/components/ui/choice-chips";
import { Sheet } from "@/components/ui/sheet";
import { TextField } from "@/components/ui/text-field";
import { UI_TEXT } from "@/constants/messages";
import { PAYMENT_STATUS_LABELS, PAYMENT_STATUSES, type PaymentStatus } from "@/constants/statuses";

/** What narrows Orders beyond its tab and search (plan §139.10). */
export interface OrderFilters {
  /** Due on or after this day, and on or before `to`: days in the business's calendar. */
  from?: string;
  to?: string;
  payment?: PaymentStatus;
  /** Guest orders only (plan §139.11.3). */
  guest?: boolean;
}

export const anyFilter = (filters: OrderFilters) =>
  Boolean(filters.from || filters.to || filters.payment || filters.guest);

const ANY = "ANY";
const WHOSE = { EVERYONE: "EVERYONE", GUESTS: "GUESTS" } as const;
type Whose = keyof typeof WHOSE;

/**
 * Orders' filters (plan §139.10): when the orders are due, how they are paid,
 * and Guest orders only — which combine, with the tab and the search. Nothing
 * changes until **Apply filters**; **Clear filters** takes them all off.
 */
export function OrderFilterSheet({
  open,
  value,
  onClose,
  onApply,
}: {
  open: boolean;
  value: OrderFilters;
  onClose: () => void;
  onApply: (filters: OrderFilters) => void;
}) {
  const text = UI_TEXT.ordersScreen;
  const [from, setFrom] = useState(value.from ?? "");
  const [to, setTo] = useState(value.to ?? "");
  const [payment, setPayment] = useState<PaymentStatus | typeof ANY>(value.payment ?? ANY);
  const [whose, setWhose] = useState<Whose>(value.guest ? "GUESTS" : "EVERYONE");

  const apply = (filters: OrderFilters) => {
    onApply(filters);
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={text.filterTitle}
      footer={
        <div className="flex gap-3 [&>*]:flex-1">
          <Button
            label={text.clear}
            variant="ghost"
            onClick={() => {
              setFrom("");
              setTo("");
              setPayment(ANY);
              setWhose("EVERYONE");
              apply({});
            }}
          />
          <Button
            label={text.apply}
            variant="action"
            onClick={() =>
              apply({
                from: from || undefined,
                to: to || undefined,
                payment: payment === ANY ? undefined : payment,
                guest: whose === "GUESTS" || undefined,
              })
            }
          />
        </div>
      }
    >
      <div className="space-y-5 pb-2">
        <div className="grid grid-cols-2 gap-3">
          <TextField label={text.dueFrom} type="date" value={from} max={to || undefined} onChange={(event) => setFrom(event.target.value)} />
          <TextField label={text.dueTo} type="date" value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)} />
        </div>
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold text-text">{text.payment}</legend>
          <ChoiceChips
            label={text.payment}
            value={payment}
            onChange={setPayment}
            options={[
              { value: ANY, label: text.anyPayment },
              ...PAYMENT_STATUSES.map((entry) => ({ value: entry, label: PAYMENT_STATUS_LABELS[entry] })),
            ]}
          />
        </fieldset>
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold text-text">{text.whose}</legend>
          <ChoiceChips
            label={text.whose}
            value={whose}
            onChange={setWhose}
            options={[
              { value: WHOSE.EVERYONE, label: text.everyone },
              { value: WHOSE.GUESTS, label: text.guestsOnly },
            ]}
          />
        </fieldset>
      </div>
    </Sheet>
  );
}
