"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { FormSheet } from "@/components/ui/form-sheet";
import { optionsFrom, SelectField, TextField } from "@/components/ui/text-field";
import { INVENTORY_TRANSACTION_LABELS, MANUAL_INVENTORY_TYPES } from "@/constants/statuses";
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

const EMPTY: StockAdjustmentFormValues = { type: "STOCK_IN", quantity: "" };

/**
 * Records one movement in the stock ledger. The baker types a plain count and
 * chooses what happened; which way that moves stock is the type's business
 * (signedQuantity), not theirs (AGENTS.md §14).
 */
export function InventoryAdjustmentSheet({
  isOpen,
  onClose,
  onSuccess,
  product,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product?: Product;
}) {
  // Kept out of the React Compiler. The sheet stays mounted and resets its form
  // each time it opens; reset() empties react-hook-form's field registry, which
  // only a fresh register() call refills, and the compiler memoises those
  // calls — so nothing typed after opening reached the form (R1.9).
  "use no memo";
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StockAdjustmentFormValues, unknown, StockAdjustmentFormPayload>({
    resolver: zodResolver(stockAdjustmentFormSchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (isOpen) reset(EMPTY);
  }, [isOpen, reset]);

  // Read here, never as `product!.id` inside the callback: the React Compiler
  // lifts that read into a render-time memo dependency, and it threw on every
  // visit while the sheet was closed with no product (plan §134 P0-1). The sheet
  // opens only with a product, so the empty id is never sent.
  const productId = product?.id ?? "";
  const { submit, submitting, error } = useApiMutation<StockAdjustmentFormPayload, InventoryTransaction>(
    (values) =>
      InventoryClient.adjustStock({
        productId,
        type: values.type,
        quantity: signedQuantity(values.type, values.quantity),
        referenceType: "MANUAL",
      }),
    {
      revalidate: [apiRoutes.inventory.balances()],
      onSuccess: () => {
        onSuccess();
        onClose();
      },
    },
  );

  // The sheet stays mounted with no product yet, so its form is in place
  // before it first opens (R1.9); it opens only once there is one.
  return (
    <FormSheet
      open={isOpen && product !== undefined}
      title={product ? `Adjust Stock — ${product.name}` : "Adjust Stock"}
      onClose={onClose}
      onSubmit={handleSubmit((values) => submit(values))}
      submitLabel="Confirm Adjustment"
      submitting={submitting}
      error={error}
    >
      <SelectField
        label="Adjustment Type"
        required
        options={optionsFrom(MANUAL_INVENTORY_TYPES, INVENTORY_TRANSACTION_LABELS)}
        error={errors.type?.message}
        {...register("type")}
      />
      <TextField
        label={product ? `Quantity (in ${product.unit}s)` : "Quantity"}
        required
        inputMode="numeric"
        placeholder="0"
        hint="Enter a plain count. Wastage is taken off stock; an adjustment may be negative."
        error={errors.quantity?.message}
        {...register("quantity")}
      />
    </FormSheet>
  );
}
