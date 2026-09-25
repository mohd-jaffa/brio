"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreditCard, Plus, ShoppingBag, Trash2, Truck, User } from "lucide-react";

import { AppShell } from "@/components/nav/AppShell";
import { Button, IconButton } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { useResponse } from "@/components/ui/response-card";
import { ScreenNotice } from "@/components/ui/screen-notice";
import {
  optionsFrom,
  SelectField,
  TextAreaField,
  TextField,
  type SelectOption,
} from "@/components/ui/text-field";
import { UI_TEXT } from "@/constants/messages";
import {
  DELIVERY_TYPE_LABELS,
  DELIVERY_TYPES,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUSES,
} from "@/constants/statuses";
import type { Customer } from "@/features/customers/types";
import { OrdersClient } from "@/features/orders/api.client";
import { orderTotals } from "@/features/orders/totals";
import type { Order } from "@/features/orders/types";
import type { Product } from "@/features/products/types";
import { formatPaise } from "@/lib/format/currency";
import { parseRupees } from "@/lib/money";
import { apiRoutes } from "@/lib/query/keys";
import { useApiMutation } from "@/lib/query/useApiMutation";
import { useApiQuery } from "@/lib/query/useApiQuery";
import { orderFormSchema, type OrderFormPayload, type OrderFormValues } from "@/lib/validation";

/** Tomorrow at this hour, as a datetime-local field wants it. */
function tomorrow(): string {
  const when = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const offset = when.getTimezoneOffset() * 60_000;
  return new Date(when.getTime() - offset).toISOString().slice(0, 16);
}

const EMPTY: OrderFormValues = {
  customerId: "",
  items: [{ productId: "", quantity: 1, notes: "" }],
  adjustments: [],
  delivery: { type: "PICKUP", date: tomorrow(), address: "", googleMapsLink: "" },
  payment: { status: "UNPAID", method: "CASH", reference: "" },
  notes: "",
};

/** A labelled block of the checkout form. */
function Step({
  title,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  icon: typeof User;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-2xl border border-border bg-surface p-5 shadow-card">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-heading text-sm font-bold text-text">
          <Icon size={18} strokeWidth={2.5} className="text-primary" aria-hidden="true" />
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/**
 * The checkout (AGENTS.md §12). The total shown as it is built uses the same
 * formula the server applies when the order is created, so the bill previewed
 * is the bill created — but the server's figure is the one that is stored.
 */
export default function NewOrderPage() {
  const router = useRouter();

  const customers = useApiQuery<Customer[]>(apiRoutes.customers.list);
  const products = useApiQuery<Product[]>(apiRoutes.products.list);

  const active = useMemo(
    () => (products.data ?? []).filter((product) => product.isActive),
    [products.data],
  );

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<OrderFormValues, unknown, OrderFormPayload>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: EMPTY,
  });

  const items = useFieldArray({ control, name: "items" });
  const adjustments = useFieldArray({ control, name: "adjustments" });

  // useWatch rather than watch(): it returns a value, not a function, so the
  // screen stays something React Compiler can memoize.
  const watchedItems = useWatch({ control, name: "items" });
  const watchedAdjustments = useWatch({ control, name: "adjustments" });
  const deliveryType = useWatch({ control, name: "delivery.type" });
  const paymentStatus = useWatch({ control, name: "payment.status" });

  const totals = useMemo(() => {
    const priceOf = new Map(active.map((product) => [product.id, product.defaultPrice]));
    return orderTotals(
      watchedItems
        .filter((item) => item.productId && item.quantity > 0)
        .map((item) => ({ unitPrice: priceOf.get(item.productId) ?? 0, quantity: item.quantity })),
      watchedAdjustments.map((entry) => ({
        type: entry.type,
        // What is typed so far, read the way the form will read it; an
        // amount still being typed counts as nothing rather than "₹NaN".
        amount: parseRupees(entry.amount) ?? 0,
      })),
    );
  }, [watchedItems, watchedAdjustments, active]);

  const respond = useResponse();
  const create = useApiMutation<OrderFormPayload, Order>(
    (values) => OrdersClient.createOrder(values),
    {
      revalidate: [apiRoutes.orders.list],
      // The placed-order card, with its facts and actions, comes with R3.14.
      onSuccess: (order) => router.push(`/orders/${order.id}`),
      onError: (failure) =>
        respond.failure(failure, { title: UI_TEXT.outcomes.orderNotPlaced, fallback: "SAVE_FAILED" }),
    },
  );

  const customerOptions: SelectOption[] = (customers.data ?? []).map((customer) => ({
    value: customer.id,
    label: `${customer.name} (${customer.phone})`,
  }));

  const productOptions: SelectOption[] = active.map((product) => ({
    value: product.id,
    label: `${product.name} — ${formatPaise(product.defaultPrice)}/${product.unit}`,
  }));

  return (
    <AppShell>
      <PageHeader title="Create Order" back="/orders" />

      <form
        id="new-order-form"
        onSubmit={handleSubmit((values) => create.submit(values))}
        className="space-y-6 pb-28"
        noValidate
      >
        <Step title="Customer" icon={User}>
          <SelectField
            label="Select Customer"
            required
            placeholder="Choose a customer…"
            options={customerOptions}
            error={errors.customerId?.message}
            {...register("customerId")}
          />
        </Step>

        <Step
          title="Order Items"
          icon={ShoppingBag}
          action={
            <Button
              size="sm"
              variant="secondary"
              icon={Plus}
              label="Add Item"
              onClick={() => items.append({ productId: "", quantity: 1, notes: "" })}
            />
          }
        >
          {errors.items?.root?.message && <ScreenNotice>{errors.items.root.message}</ScreenNotice>}

          <ul role="list" className="space-y-4">
            {items.fields.map((field, index) => (
              <li key={field.id} className="relative rounded-xl border border-border bg-background p-4">
                {items.fields.length > 1 && (
                  <div className="absolute -right-2 -top-2">
                    <IconButton
                      icon={Trash2}
                      tone="danger"
                      label={`Remove item ${index + 1}`}
                      onClick={() => items.remove(index)}
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
                  <div className="sm:col-span-8">
                    <SelectField
                      label="Product"
                      required
                      placeholder="Select a product…"
                      options={productOptions}
                      error={errors.items?.[index]?.productId?.message}
                      {...register(`items.${index}.productId` as const)}
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <TextField
                      label="Qty"
                      required
                      type="number"
                      min={1}
                      error={errors.items?.[index]?.quantity?.message}
                      {...register(`items.${index}.quantity` as const, { valueAsNumber: true })}
                    />
                  </div>
                </div>

                <div className="mt-3">
                  <TextField
                    label="Item notes"
                    placeholder="Special instructions for this item…"
                    error={errors.items?.[index]?.notes?.message}
                    {...register(`items.${index}.notes` as const)}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Step>

        <Step
          title="Discounts & Charges"
          icon={CreditCard}
          action={
            <Button
              size="sm"
              variant="secondary"
              icon={Plus}
              label="Add"
              onClick={() => adjustments.append({ type: "CHARGE", name: "Delivery Fee", amount: "" })}
            />
          }
        >
          {adjustments.fields.length === 0 ? (
            <p className="text-xs font-medium italic text-text-muted">
              No extra charges or discounts applied.
            </p>
          ) : (
            <ul role="list" className="space-y-3">
              {adjustments.fields.map((field, index) => (
                <li key={field.id} className="grid grid-cols-1 gap-3 sm:grid-cols-12 sm:items-end">
                  <div className="sm:col-span-3">
                    <SelectField
                      label="Kind"
                      options={[
                        { value: "CHARGE", label: "Charge (+)" },
                        { value: "DISCOUNT", label: "Discount (−)" },
                      ]}
                      {...register(`adjustments.${index}.type` as const)}
                    />
                  </div>
                  <div className="sm:col-span-5">
                    <TextField
                      label="Name"
                      placeholder="e.g. Delivery, Coupon"
                      error={errors.adjustments?.[index]?.name?.message}
                      {...register(`adjustments.${index}.name` as const)}
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <TextField
                      label="Amount (₹)"
                      inputMode="decimal"
                      placeholder="0.00"
                      error={errors.adjustments?.[index]?.amount?.message}
                      {...register(`adjustments.${index}.amount` as const)}
                    />
                  </div>
                  <div className="sm:col-span-1 sm:pb-1">
                    <IconButton
                      icon={Trash2}
                      tone="danger"
                      label={`Remove adjustment ${index + 1}`}
                      onClick={() => adjustments.remove(index)}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Step>

        <Step title="Delivery" icon={Truck}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SelectField
              label="Type"
              required
              options={optionsFrom(DELIVERY_TYPES, DELIVERY_TYPE_LABELS)}
              {...register("delivery.type")}
            />
            <TextField
              label="Date & Time"
              required
              type="datetime-local"
              error={errors.delivery?.date?.message}
              {...register("delivery.date")}
            />
          </div>

          {deliveryType === "DELIVERY" && (
            <div className="space-y-4">
              <TextAreaField
                label="Address"
                placeholder="Delivery address…"
                error={errors.delivery?.address?.message}
                {...register("delivery.address")}
              />
              <TextField
                label="Google Maps Link"
                type="url"
                placeholder="https://maps.google.com/…"
                error={errors.delivery?.googleMapsLink?.message}
                {...register("delivery.googleMapsLink")}
              />
            </div>
          )}
        </Step>

        <Step title="Payment" icon={CreditCard}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SelectField
              label="Status"
              required
              options={optionsFrom(PAYMENT_STATUSES, PAYMENT_STATUS_LABELS)}
              {...register("payment.status")}
            />
            {paymentStatus !== "UNPAID" && (
              <SelectField
                label="Method"
                options={optionsFrom(PAYMENT_METHODS, PAYMENT_METHOD_LABELS)}
                {...register("payment.method")}
              />
            )}
          </div>
        </Step>

        <Step title="Notes" icon={ShoppingBag}>
          <TextAreaField
            label="Internal Notes"
            placeholder="Not shown to the customer…"
            error={errors.notes?.message}
            {...register("notes")}
          />
        </Step>
      </form>

      <div className="safe-bottom [--safe-pb:1rem] safe-x [--safe-px:1rem] fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/80 pt-4 shadow-elevated backdrop-blur-md md:pl-64">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Total</span>
            <span className="block font-heading text-xl font-bold leading-none text-text">
              {formatPaise(totals.total)}
            </span>
          </div>

          <Button
            type="submit"
            form="new-order-form"
            label="Place Order"
            loading={create.submitting}
            disabled={totals.total < 0}
          />
        </div>
      </div>
    </AppShell>
  );
}
