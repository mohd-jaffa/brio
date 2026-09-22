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

  const { submit, submitting, error } = useApiMutation<StockAdjustmentFormPayload, InventoryTransaction>(
    (values) =>
      InventoryClient.adjustStock({
        productId: product!.id,
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

  if (!product) return null;

  return (
    <FormSheet
      open={isOpen}
      title={`Adjust Stock — ${product.name}`}
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
        label={`Quantity (in ${product.unit}s)`}
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
