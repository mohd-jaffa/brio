"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { FormSheet } from "@/components/ui/form-sheet";
import { optionsFrom, SelectField, TextAreaField, TextField } from "@/components/ui/text-field";
import { paiseToRupees } from "@/lib/money";
import { apiRoutes } from "@/lib/query/keys";
import { useApiMutation } from "@/lib/query/useApiMutation";
import {
  PRODUCT_UNIT_LABELS,
  PRODUCT_UNITS,
  productFormSchema,
  type ProductFormPayload,
  type ProductFormValues,
} from "@/lib/validation";

import { ProductsClient } from "../api.client";
import type { Product } from "../types";

const EMPTY: ProductFormValues = {
  name: "",
  description: "",
  defaultPrice: "",
  unit: "piece",
  isActive: true,
};

function valuesOf(product?: Product): ProductFormValues {
  if (!product) return EMPTY;
  return {
    name: product.name,
    description: product.description ?? "",
    // The price is stored in paise and typed in rupees.
    defaultPrice: paiseToRupees(product.defaultPrice).toFixed(2),
    unit: (PRODUCT_UNITS as readonly string[]).includes(product.unit)
      ? (product.unit as ProductFormValues["unit"])
      : "piece",
    isActive: product.isActive,
  };
}

export function ProductFormSheet({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Product;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProductFormValues, unknown, ProductFormPayload>({
    resolver: zodResolver(productFormSchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (isOpen) reset(valuesOf(initialData));
  }, [isOpen, initialData, reset]);

  const { submit, submitting, error } = useApiMutation<ProductFormPayload, Product>(
    (values) =>
      initialData
        ? ProductsClient.updateProduct(initialData.id, values)
        : ProductsClient.createProduct(values),
    {
      revalidate: [apiRoutes.products.list],
      onSuccess: () => {
        onSuccess();
        onClose();
      },
    },
  );

  return (
    <FormSheet
      open={isOpen}
      title={initialData ? "Edit Product" : "New Product"}
      onClose={onClose}
      onSubmit={handleSubmit((values) => submit(values))}
      submitLabel="Save Product"
      submitting={submitting}
      error={error}
    >
      <TextField
        label="Product Name"
        required
        placeholder="e.g. Chocolate Truffle Cake"
        error={errors.name?.message}
        {...register("name")}
      />

      <div className="grid grid-cols-2 gap-4">
        <TextField
          label="Price (₹)"
          required
          inputMode="decimal"
          placeholder="0.00"
          error={errors.defaultPrice?.message}
          {...register("defaultPrice")}
        />
        <SelectField
          label="Unit"
          required
          options={optionsFrom(PRODUCT_UNITS, PRODUCT_UNIT_LABELS)}
          error={errors.unit?.message}
          {...register("unit")}
        />
      </div>

      <TextAreaField
        label="Description"
        placeholder="Product details..."
        error={errors.description?.message}
        {...register("description")}
      />

      <div className="flex items-center gap-3 pt-2">
        <input
          type="checkbox"
          id="product-is-active"
          className="h-5 w-5 rounded border-border text-primary focus:ring-primary"
          {...register("isActive")}
        />
        <label htmlFor="product-is-active" className="text-sm font-medium text-text">
          Available for orders
        </label>
      </div>
    </FormSheet>
  );
}
