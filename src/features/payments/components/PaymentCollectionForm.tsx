"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { FormSheet } from "@/components/ui/form-sheet";
import { useResponse } from "@/components/ui/response-card";
import { optionsFrom, SelectField, TextField } from "@/components/ui/text-field";
import { UI_TEXT } from "@/constants/messages";
import { useRequestKeys } from "@/hooks/useRequestKeys";
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS } from "@/constants/statuses";
import { formatPaise } from "@/lib/format/currency";
import { paiseToRupees } from "@/lib/money";
import { apiRoutes } from "@/lib/query/keys";
import { useApiMutation } from "@/lib/query/useApiMutation";
import {
  paymentFormSchema,
  type PaymentFormPayload,
  type PaymentFormValues,
} from "@/lib/validation";

import { PaymentsClient } from "../api.client";
import type { Payment } from "../types";

/**
 * Collects a payment against an order. What is still owed is worked out in
 * paise and offered as the amount, so the common case is one tap.
 */
export function PaymentCollectionForm({
  orderId,
  orderTotal,
  totalPaid,
  onPaymentSuccess,
  onCancel,
}: {
  orderId: string;
  /** Both in whole paise (AGENTS.md §13). */
  orderTotal: number;
  totalPaid: number;
  onPaymentSuccess: () => void;
  onCancel: () => void;
}) {
  const remaining = Math.max(orderTotal - totalPaid, 0);

  const defaults: PaymentFormValues = {
    amount: paiseToRupees(remaining).toFixed(2),
    payment_method: "UPI",
    reference: "",
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PaymentFormValues, unknown, PaymentFormPayload>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: defaults,
  });

  const respond = useResponse();
  const keys = useRequestKeys();
  const { submit, submitting } = useApiMutation<PaymentFormPayload, Payment>(
    (values) => PaymentsClient.createPayment(orderId, values, keys.keyFor(values)),
    {
      revalidate: [apiRoutes.orders.payments(orderId), apiRoutes.orders.detail(orderId)],
      onSuccess: (payment) => {
        keys.settle();
        onPaymentSuccess();
        respond.success({
          title: UI_TEXT.outcomes.paymentRecorded,
          facts: [
            { label: UI_TEXT.outcomes.amount, value: formatPaise(payment.amount) },
            { label: UI_TEXT.outcomes.balanceDue, value: formatPaise(Math.max(remaining - payment.amount, 0)) },
          ],
        });
      },
      onError: (failure) =>
        respond.failure(failure, { title: UI_TEXT.outcomes.paymentNotRecorded, fallback: "SAVE_FAILED" }),
    },
  );

  return (
    <FormSheet
      open
      title="Collect Payment"
      onClose={onCancel}
      onSubmit={handleSubmit((values) => submit(values))}
      submitLabel="Record Payment"
      submitting={submitting}
    >
      <p className="text-sm text-text-muted">Still owed: {formatPaise(remaining)}</p>

      <TextField
        label="Amount (₹)"
        required
        inputMode="decimal"
        placeholder="e.g. 500"
        error={errors.amount?.message}
        {...register("amount")}
      />
      <SelectField
        label="Payment Method"
        required
        options={optionsFrom(PAYMENT_METHODS, PAYMENT_METHOD_LABELS)}
        error={errors.payment_method?.message}
        {...register("payment_method")}
      />
      <TextField
        label="Reference"
        placeholder="Transaction ID, cheque number…"
        error={errors.reference?.message}
        {...register("reference")}
      />
    </FormSheet>
  );
}
