import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createPaymentSchema, type CreatePaymentPayload } from "@/lib/validation";
import { PaymentsClient } from "@/features/payments/api.client";
import { ERROR_MESSAGES } from "@/constants/messages";

interface Props {
  orderId: string;
  orderTotal: number;
  totalPaid: number;
  onPaymentSuccess: () => void;
  onCancel: () => void;
}

export function PaymentCollectionForm({ orderId, orderTotal, totalPaid, onPaymentSuccess, onCancel }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const remaining = orderTotal - totalPaid;

  const { register, handleSubmit, formState: { errors } } = useForm<any>({
    resolver: zodResolver(createPaymentSchema),
    defaultValues: {
      order_id: orderId,
      amount: String(remaining / 100) as unknown as number, // hack to allow string input for number schema
      payment_method: "UPI",
      reference: "",
    },
  });

  const onSubmit = async (data: CreatePaymentPayload) => {
    setIsSubmitting(true);
    try {
      await PaymentsClient.createPayment(orderId, {
        amount: data.amount as any, // Send string value that zod expects
        payment_method: data.payment_method,
        reference: data.reference || null,
      });
      onPaymentSuccess();
    } catch (err) {
      console.error(err);
      alert(ERROR_MESSAGES.EXTERNAL_SERVICE_ERROR);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-200">
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-4 sm:p-6 border-b border-border">
          <h2 className="text-lg font-bold font-heading">Collect Payment</h2>
          <p className="text-sm text-text-muted mt-1">Remaining amount: ₹{(remaining / 100).toLocaleString('en-IN')}</p>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="p-4 sm:p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-text mb-1.5">Amount (₹)</label>
            <input
              type="text"
              {...register("amount")}
              className={`w-full text-base font-medium py-2.5 px-3 border rounded-xl bg-background focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all ${
                errors.amount ? "border-danger focus:ring-danger" : "border-border"
              }`}
              placeholder="e.g. 500"
              disabled={isSubmitting}
            />
            {errors.amount && (
              <p className="text-danger text-xs mt-1.5 font-medium">{errors.amount.message as string}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-bold text-text mb-1.5">Payment Method</label>
            <select
              {...register("payment_method")}
              className="w-full text-base font-medium py-2.5 px-3 border border-border rounded-xl bg-background focus:ring-2 focus:ring-primary focus:border-primary outline-none"
              disabled={isSubmitting}
            >
              <option value="CASH">Cash</option>
              <option value="UPI">UPI</option>
              <option value="CARD">Card</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-text mb-1.5">Reference (Optional)</label>
            <input
              type="text"
              {...register("reference")}
              className="w-full text-base font-medium py-2.5 px-3 border border-border rounded-xl bg-background focus:ring-2 focus:ring-primary focus:border-primary outline-none"
              placeholder="Transaction ID, Cheque No, etc."
              disabled={isSubmitting}
            />
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 rounded-xl font-bold text-sm bg-background border border-border text-text hover:bg-surface-hover transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 rounded-xl font-bold text-sm bg-primary text-primary-text shadow-md hover:shadow-lg hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              {isSubmitting ? "Saving..." : "Record Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
