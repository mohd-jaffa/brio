"use client";

import { MapPin, Plus, Trash2, UserPlus, UserRound } from "lucide-react";
import { useState, type ReactNode } from "react";

import { ActionRow } from "@/components/ui/action-row";
import { Avatar } from "@/components/ui/avatar";
import { Button, IconButton } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { FieldError } from "@/components/ui/field-error";
import { ProductTile } from "@/components/ui/product-tile";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { SelectField, TextAreaField, TextField } from "@/components/ui/text-field";
import { UI_TEXT } from "@/constants/messages";
import { ADJUSTMENT_TYPES, DELIVERY_TYPE_LABELS, DELIVERY_TYPES, type AdjustmentType } from "@/constants/statuses";
import type { Product } from "@/features/products/types";
import { useArrived } from "@/hooks/useArrived";
import { formatPaise } from "@/lib/format/currency";
import { formatPhoneDigits } from "@/lib/phone";

import {
  addAdjustment,
  linePrice,
  offersCustomerPlace,
  removeAdjustment,
  removeLine,
  setAdjustment,
  setDelivery,
  setDeliveryType,
  setLineNote,
  setNotes,
  setQuantity,
  takeCustomerPlace,
  type OrderDraft,
} from "../draft";

/** A titled block of the details step, with an action beside its title. */
function Block({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading text-lg font-medium text-text">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/**
 * The second step (plan §139.10): who the order is for, the items with their
 * steppers and the note each prints on the bill, how it is handed over — the
 * address filled from the customer (§139.11.4) — the discounts and charges,
 * and the notes only the owner sees.
 */
export function DetailsPanel({
  draft,
  products,
  errors,
  update,
  onChooseCustomer,
  onNewCustomer,
  onAddMore,
}: {
  draft: OrderDraft;
  /** Every product the business has, on sale or not, to name the lines. */
  products: ReadonlyMap<string, Product>;
  /** The issue under each field's path, once the step has been tried. */
  errors: Readonly<Record<string, string>>;
  update: (change: (draft: OrderDraft) => OrderDraft) => void;
  onChooseCustomer: () => void;
  onNewCustomer: () => void;
  /** Back to the grid; absent where the grid is already beside it. */
  onAddMore?: () => void;
}) {
  const text = UI_TEXT.newOrder;
  const { customer, delivery } = draft;
  // What was already in the order when the screen opened just shows; a line,
  // a discount or the delivery fields added since drop into place.
  const [opened] = useState(() => new Set([...draft.lines, ...draft.adjustments].map((entry) => entry.key)));
  const added = (key: string) => !opened.has(key) && "animate-drop-in";
  // A line is added on the grid, which a phone shows instead of this list;
  // only the wide screen, with both in view, sees it land.
  const addedLine = (key: string) => !opened.has(key) && "lg:animate-drop-in";
  const deliveryArrived = useArrived(delivery.type === "DELIVERY");

  const customerCard =
    customer === null
      ? {
          leading: <UserRound size={20} strokeWidth={1.75} aria-hidden="true" />,
          title: text.chooseCustomer,
          subtitle: text.chooseCustomerHint,
        }
      : customer.kind === "GUEST"
        ? {
            leading: <UserRound size={20} strokeWidth={1.75} aria-hidden="true" />,
            title: UI_TEXT.orders.guest,
            subtitle: UI_TEXT.customerPicker.guestHint,
          }
        : {
            leading: <Avatar name={customer.name} size="sm" />,
            title: customer.name,
            subtitle: `${UI_TEXT.fields.phonePrefix} ${formatPhoneDigits(customer.phone)}`,
          };

  const addAdjustmentOf = (type: AdjustmentType) =>
    update((current) => addAdjustment(current, type, type === "DISCOUNT" ? text.discountName : text.chargeName));

  return (
    <div className="space-y-8">
      <Block
        title={text.customer}
        action={
          <Button size="sm" variant="secondary" icon={UserPlus} label={text.newCustomer} onClick={onNewCustomer} />
        }
      >
        <ActionRow
          onClick={onChooseCustomer}
          aria-label={customer === null ? text.chooseCustomer : text.changeCustomer(customerCard.title)}
          aria-describedby={errors.customer ? "order-customer-error" : undefined}
          title={customerCard.title}
          subtitle={customerCard.subtitle}
          leading={
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
              {customerCard.leading}
            </span>
          }
        />
        <FieldError id="order-customer-error" message={errors.customer} />
      </Block>

      <Block
        title={text.orderItems}
        action={
          onAddMore && <Button size="sm" variant="ghost" icon={Plus} label={text.addMoreItems} onClick={onAddMore} />
        }
      >
        <FieldError message={errors.items} />
        <ul role="list" className="space-y-3">
          {draft.lines.map((line, index) => {
            const product = line.productId ? products.get(line.productId) : undefined;
            const name = line.custom?.name ?? line.agreed?.name ?? product?.name ?? text.unavailable;
            const price = linePrice(line, (id) => products.get(id)?.defaultPrice);
            return (
              <li
                key={line.key}
                className={cn("rounded-2xl border border-border bg-surface p-3 shadow-card", addedLine(line.key))}
              >
                <div className="flex items-center gap-3">
                  <ProductTile iconKey={line.custom ? null : product?.iconKey} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-text">{name}</p>
                    <p className="flex items-center gap-2 text-sm text-text-muted">
                      {line.custom && (
                        <span className="rounded-full bg-sunken px-2 py-0.5 text-xs font-medium text-text">
                          {text.customMark}
                        </span>
                      )}
                      {price !== undefined && <span className="tabular-nums">{formatPaise(price)}</span>}
                    </p>
                  </div>
                  <IconButton
                    icon={Trash2}
                    tone="danger"
                    label={text.remove(name)}
                    onClick={() => update((current) => removeLine(current, line.key))}
                  />
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <QuantityStepper
                    value={line.quantity}
                    label={text.quantityOf(name)}
                    onChange={(quantity) => update((current) => setQuantity(current, line.key, quantity))}
                  />
                  {price !== undefined && (
                    <span className="text-sm font-semibold tabular-nums text-text">
                      {formatPaise(price * line.quantity)}
                    </span>
                  )}
                </div>
                <div className="mt-3">
                  <TextField
                    label={text.itemNote}
                    optional
                    placeholder={text.itemNotePlaceholder}
                    value={line.notes}
                    error={errors[`items.${index}.notes`] ?? errors[`items.${index}.productId`]}
                    onChange={(event) => update((current) => setLineNote(current, line.key, event.target.value))}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </Block>

      <Block title={text.delivery}>
        <SegmentedControl
          label={text.handOver}
          value={delivery.type}
          options={DELIVERY_TYPES.map((type) => ({
            value: type,
            label: DELIVERY_TYPE_LABELS[type],
          }))}
          onChange={(type) => update((current) => setDeliveryType(current, type))}
        />
        <TextField
          label={text.dateTime}
          required
          type="datetime-local"
          value={delivery.date}
          error={errors["delivery.date"]}
          onChange={(event) => update((current) => setDelivery(current, { date: event.target.value }))}
        />
        {delivery.type === "DELIVERY" && (
          <div className={cn("space-y-3", deliveryArrived && "animate-drop-in")}>
            <TextAreaField
              label={text.address}
              placeholder={text.addressPlaceholder}
              value={delivery.address}
              error={errors["delivery.address"]}
              onChange={(event) => update((current) => setDelivery(current, { address: event.target.value }))}
            />
            <TextField
              label={UI_TEXT.fields.mapLink}
              optional
              type="url"
              inputMode="url"
              placeholder={UI_TEXT.fields.mapLinkPlaceholder}
              value={delivery.googleMapsLink}
              error={errors["delivery.googleMapsLink"]}
              onChange={(event) => update((current) => setDelivery(current, { googleMapsLink: event.target.value }))}
            />
            {offersCustomerPlace(draft) && customer?.kind === "CUSTOMER" && (
              <Button
                size="sm"
                variant="ghost"
                icon={MapPin}
                label={text.useCustomerPlace(customer.name)}
                onClick={() => update(takeCustomerPlace)}
              />
            )}
          </div>
        )}
      </Block>

      <Block title={text.discounts}>
        {draft.adjustments.length > 0 && (
          <ul role="list" className="space-y-3">
            {draft.adjustments.map((entry, index) => (
              <li
                key={entry.key}
                className={cn(
                  "grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 sm:grid-cols-[9rem_minmax(0,1fr)_8rem_auto]",
                  added(entry.key),
                )}
              >
                <div className="col-span-2 sm:col-span-1">
                  <SelectField
                    label={text.adjustmentKind}
                    value={entry.type}
                    options={ADJUSTMENT_TYPES.map((type) => ({
                      value: type,
                      label: text.adjustmentKinds[type],
                    }))}
                    onChange={(type) =>
                      update((current) =>
                        setAdjustment(current, entry.key, {
                          type: type as AdjustmentType,
                        }),
                      )
                    }
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <TextField
                    label={text.adjustmentName}
                    value={entry.name}
                    error={errors[`adjustments.${index}.name`]}
                    onChange={(event) =>
                      update((current) =>
                        setAdjustment(current, entry.key, {
                          name: event.target.value,
                        }),
                      )
                    }
                  />
                </div>
                <TextField
                  label={text.adjustmentAmount}
                  inputMode="decimal"
                  value={entry.amount}
                  error={errors[`adjustments.${index}.amount`]}
                  onChange={(event) =>
                    update((current) =>
                      setAdjustment(current, entry.key, {
                        amount: event.target.value,
                      }),
                    )
                  }
                />
                <div className="pb-1">
                  <IconButton
                    icon={Trash2}
                    tone="danger"
                    label={text.removeAdjustment(entry.name)}
                    onClick={() => update((current) => removeAdjustment(current, entry.key))}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            icon={Plus}
            label={text.addDiscount}
            onClick={() => addAdjustmentOf("DISCOUNT")}
          />
          <Button
            size="sm"
            variant="secondary"
            icon={Plus}
            label={text.addCharge}
            onClick={() => addAdjustmentOf("CHARGE")}
          />
        </div>
      </Block>

      <TextAreaField
        label={text.internalNotes}
        optional
        hint={text.internalNotesHint}
        value={draft.notes}
        error={errors.notes}
        onChange={(event) => update((current) => setNotes(current, event.target.value))}
      />
    </div>
  );
}
