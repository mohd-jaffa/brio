"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ChoiceChips } from "@/components/ui/choice-chips";
import { Sheet } from "@/components/ui/sheet";
import { UI_TEXT } from "@/constants/messages";
import {
  OPEN_STATUSES,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUSES,
  type OpenStatus,
  type PaymentStatus,
} from "@/constants/statuses";

export interface DueFilters {
  status?: OpenStatus;
  payment?: PaymentStatus;
}

const ANY = "ANY";

/**
 * Filters on Home's orders due (plan §116, §117): how far along, and how paid,
 * which combine — "Preparing" and "Unpaid" shows only preparing orders not
 * yet paid. Nothing changes until **Apply filters**; **Clear filters** shows
 * every order due again.
 */
export function DueFilterSheet({
  open,
  value,
  onClose,
  onApply,
}: {
  open: boolean;
  value: DueFilters;
  onClose: () => void;
  onApply: (filters: DueFilters) => void;
}) {
  const text = UI_TEXT.home;
  const [status, setStatus] = useState<OpenStatus | typeof ANY>(value.status ?? ANY);
  const [payment, setPayment] = useState<PaymentStatus | typeof ANY>(value.payment ?? ANY);

  const apply = (filters: DueFilters) => {
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
              setStatus(ANY);
              setPayment(ANY);
              apply({});
            }}
          />
          <Button
            label={text.apply}
            variant="action"
            onClick={() =>
              apply({
                status: status === ANY ? undefined : status,
                payment: payment === ANY ? undefined : payment,
              })
            }
          />
        </div>
      }
    >
      <div className="space-y-5 pb-2">
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold text-text">{text.preparation}</legend>
          <ChoiceChips
            label={text.preparation}
            value={status}
            onChange={setStatus}
            options={[
              { value: ANY, label: text.anyStatus },
              ...OPEN_STATUSES.map((entry) => ({ value: entry, label: ORDER_STATUS_LABELS[entry] })),
            ]}
          />
        </fieldset>
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold text-text">{text.payment}</legend>
          <ChoiceChips
            label={text.payment}
            value={payment}
            onChange={setPayment}
            options={[
              { value: ANY, label: text.anyStatus },
              ...PAYMENT_STATUSES.map((entry) => ({ value: entry, label: PAYMENT_STATUS_LABELS[entry] })),
            ]}
          />
        </fieldset>
      </div>
    </Sheet>
  );
}
