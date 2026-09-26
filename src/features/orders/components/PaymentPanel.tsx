"use client";

import { ChoiceChips } from "@/components/ui/choice-chips";
import { cn } from "@/components/ui/cn";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { TextField } from "@/components/ui/text-field";
import { UI_TEXT } from "@/constants/messages";
import { PAYMENT_CHOICES_AT_PLACING, PAYMENT_METHOD_LABELS, PAYMENT_METHODS } from "@/constants/statuses";
import { useArrived } from "@/hooks/useArrived";

import { setPayment, type OrderDraft } from "../draft";

/**
 * The last step (plan §139.10, §139.11.9): what has been paid as the order is
 * placed. Paid in full or part paid records a payment with the order — part
 * paid asks how much — and the order's payment status follows from it; it is
 * never chosen by hand afterwards.
 */
export function PaymentPanel({
  payment,
  errors,
  update,
}: {
  payment: OrderDraft["payment"];
  errors: Readonly<Record<string, string>>;
  update: (change: (draft: OrderDraft) => OrderDraft) => void;
}) {
  const text = UI_TEXT.newOrder;
  const change = (changes: Partial<OrderDraft["payment"]>) => update((current) => setPayment(current, changes));
  // Chosen here, rather than restored with the draft: they settle into place.
  const paying = useArrived(payment.status !== "UNPAID");
  const parting = useArrived(payment.status === "PARTIALLY_PAID");

  return (
    <section aria-labelledby="order-payment-heading" className="space-y-4">
      <h2 id="order-payment-heading" className="font-heading text-lg font-medium text-text">
        {text.paymentStatus}
      </h2>
      <SegmentedControl
        label={text.paymentStatus}
        value={payment.status}
        options={PAYMENT_CHOICES_AT_PLACING.map((status) => ({
          value: status,
          label: text.paymentChoices[status],
        }))}
        onChange={(status) => change({ status })}
      />
      {payment.status !== "UNPAID" && (
        <div className={cn("space-y-4", paying && "animate-drop-in")}>
          {payment.status === "PARTIALLY_PAID" && (
            <div className={cn(parting && "animate-drop-in")}>
              <TextField
                label={text.amountPaid}
                required
                inputMode="decimal"
                value={payment.amount}
                error={errors["payment.amount"]}
                onChange={(event) => change({ amount: event.target.value })}
              />
            </div>
          )}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-text">{text.paymentMethod}</p>
            <ChoiceChips
              label={text.paymentMethod}
              value={payment.method}
              options={PAYMENT_METHODS.map((method) => ({
                value: method,
                label: PAYMENT_METHOD_LABELS[method],
              }))}
              onChange={(method) => change({ method })}
            />
          </div>
          <TextField
            label={text.reference}
            optional
            placeholder={text.referencePlaceholder}
            value={payment.reference}
            error={errors["payment.reference"]}
            onChange={(event) => change({ reference: event.target.value })}
          />
        </div>
      )}
    </section>
  );
}
