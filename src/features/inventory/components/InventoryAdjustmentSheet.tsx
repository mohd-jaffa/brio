"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { FormSheet } from "@/components/ui/form-sheet";
import { useResponse } from "@/components/ui/response-card";
import { optionsFrom, SelectField, TextField } from "@/components/ui/text-field";
import { UI_TEXT } from "@/constants/messages";
import { useOpeningKey } from "@/hooks/useOpeningKey";
import { INVENTORY_TRANSACTION_LABELS, MANUAL_INVENTORY_TYPES } from "@/constants/statuses";
import { pluralUnit } from "@/lib/format/quantity";
import { apiRoutes } from "@/lib/query/keys";
import { useApiMutation } from "@/lib/query/useApiMutation";
import {
  signedQuantity,
  stockAdjustmentFormSchema,
  type StockAdjustmentFormPayload,
  type StockAdjustmentFormValues,
} from "@/lib/validation";

import { InventoryClient } from "../api.client";
import type { InventoryTransaction } from "../types";
import type { Product } from "@/features/products/types";

const text = UI_TEXT.inventory.form;

const EMPTY: StockAdjustmentFormValues = { type: "STOCK_IN", quantity: "" };

/**
 * Records one movement in the stock ledger. The baker types a plain count and
 * chooses what happened; which way that moves stock is the type's business
 * (signedQuantity), not theirs (AGENTS.md §14).
 */
function InventoryAdjustmentForm({
  isOpen,
  onClose,
  product,
}: {
  isOpen: boolean;
  onClose: () => void;
  product?: Product;
}) {
  // Kept out of the React Compiler, as every react-hook-form sheet is (R1.9).
  "use no memo";
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StockAdjustmentFormValues, unknown, StockAdjustmentFormPayload>({
    resolver: zodResolver(stockAdjustmentFormSchema),
    defaultValues: EMPTY,
  });


  // Read here, never as `product!.id` inside the callback: the React Compiler
  // lifts that read into a render-time memo dependency, and it threw on every
  // visit while the sheet was closed with no product (plan §134 P0-1). The sheet
  // opens only with a product, so the empty id is never sent.
  const productId = product?.id ?? "";
  const respond = useResponse();
  const { submit, submitting } = useApiMutation<StockAdjustmentFormPayload, InventoryTransaction>(
    (values) =>
      InventoryClient.adjustStock({
        productId,
        type: values.type,
        quantity: signedQuantity(values.type, values.quantity),
        referenceType: "MANUAL",
      }),
    {
      // The balances, and the product's history if it is open.
      revalidate: [apiRoutes.inventory.balances(), apiRoutes.inventory.transactions],
      onSuccess: () => {
        onClose();
        respond.success({ title: UI_TEXT.outcomes.stockRecorded });
      },
      // A refusal is a card over the sheet, which stays open to be put right.
      onError: (failure) =>
        respond.failure(failure, { title: UI_TEXT.outcomes.stockNotRecorded, fallback: "SAVE_FAILED" }),
    },
  );

  // The sheet stays mounted with no product yet, so its form is in place
  // before it first opens (R1.9); it opens only once there is one.
  return (
    <FormSheet
      open={isOpen && product !== undefined}
      title={product ? text.titleFor(product.name) : text.title}
      onClose={onClose}
      onSubmit={handleSubmit((values) => submit(values))}
      submitLabel={text.save}
      submitting={submitting}
    >
      <SelectField
        label={text.type}
        required
        options={optionsFrom(MANUAL_INVENTORY_TYPES, INVENTORY_TRANSACTION_LABELS)}
        error={errors.type?.message}
        {...register("type")}
      />
      <TextField
        label={product ? text.quantityIn(pluralUnit(product.unit)) : text.quantity}
        required
        inputMode="numeric"
        placeholder={UI_TEXT.fields.countPlaceholder}
        hint={text.quantityHint}
        error={errors.quantity?.message}
        {...register("quantity")}
      />
    </FormSheet>
  );
}

/**
 * A fresh form for each opening (src/hooks/useOpeningKey.ts), filled from the
 * record the moment it shows. It used to reset itself in an effect as it
 * opened, which wiped what was already typed when the effect landed late.
 */
export function InventoryAdjustmentSheet(props: Parameters<typeof InventoryAdjustmentForm>[0]) {
  const opening = useOpeningKey(props.isOpen);
  return <InventoryAdjustmentForm key={opening} {...props} />;
}
