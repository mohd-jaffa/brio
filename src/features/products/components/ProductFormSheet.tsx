"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";

import { FormSheet } from "@/components/ui/form-sheet";
import { PictureField } from "@/components/ui/picture-field";
import { useResponse } from "@/components/ui/response-card";
import { optionsFrom, SelectField, TextAreaField, TextField } from "@/components/ui/text-field";
import { DEFAULT_PRODUCT_ILLUSTRATION, isIllustrationKey } from "@/constants/illustrations";
import { UI_TEXT } from "@/constants/messages";
import { useOpeningKey } from "@/hooks/useOpeningKey";
import { paiseToRupees } from "@/lib/money";
import { apiRoutes } from "@/lib/query/keys";
import { useApiMutation } from "@/lib/query/useApiMutation";
import { PRODUCT_UNITS, productFormSchema, type ProductFormPayload, type ProductFormValues } from "@/lib/validation";

import { ProductsClient } from "../api.client";
import type { Product } from "../types";

const EMPTY: ProductFormValues = {
  name: "",
  description: "",
  defaultPrice: "",
  unit: "piece",
  iconKey: null,
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
    // A key the library no longer has is shown, and saved, as the default.
    iconKey: isIllustrationKey(product.iconKey) ? product.iconKey : null,
    isActive: product.isActive,
  };
}

function ProductForm({
  isOpen,
  onClose,
  initialData,
}: {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Product;
}) {
  // Kept out of the React Compiler, as every react-hook-form sheet is (R1.9).
  "use no memo";
  const text = UI_TEXT.products.form;
  const {
    register,
    control,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductFormValues, unknown, ProductFormPayload>({
    resolver: zodResolver(productFormSchema),
    defaultValues: valuesOf(initialData),
  });
  const icon = useWatch({ control, name: "iconKey" });

  const respond = useResponse();
  const { submit, submitting } = useApiMutation<ProductFormPayload, Product>(
    (values) =>
      initialData
        ? ProductsClient.updateProduct(initialData.id, values)
        : ProductsClient.createProduct(values),
    {
      revalidate: [apiRoutes.products.list],
      onSuccess: () => {
        onClose();
        respond.success({ title: UI_TEXT.outcomes.productSaved });
      },
      // A refusal is a card over the sheet, which stays open to be put right.
      onError: (failure) =>
        respond.failure(failure, { title: UI_TEXT.outcomes.productNotSaved, fallback: "SAVE_FAILED" }),
    },
  );

  return (
    <FormSheet
      open={isOpen}
      title={initialData ? text.editTitle : text.newTitle}
      onClose={onClose}
      onSubmit={handleSubmit((values) => submit(values))}
      submitLabel={text.save}
      submitting={submitting}
    >
      <PictureField
        value={icon}
        fallback={DEFAULT_PRODUCT_ILLUSTRATION}
        onChange={(key) => setValue("iconKey", key, { shouldDirty: true })}
      />

      <TextField
        label={text.name}
        required
        placeholder={text.namePlaceholder}
        error={errors.name?.message}
        {...register("name")}
      />

      <div className="grid grid-cols-2 gap-4">
        <TextField
          label={text.price}
          required
          inputMode="decimal"
          placeholder={UI_TEXT.fields.amountPlaceholder}
          error={errors.defaultPrice?.message}
          {...register("defaultPrice")}
        />
        <SelectField
          label={text.unit}
          required
          options={optionsFrom(PRODUCT_UNITS, UI_TEXT.products.units)}
          error={errors.unit?.message}
          {...register("unit")}
        />
      </div>

      <TextAreaField
        label={text.description}
        placeholder={text.descriptionPlaceholder}
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
          {text.onSale}
        </label>
      </div>
    </FormSheet>
  );
}

/**
 * A fresh form for each opening (src/hooks/useOpeningKey.ts), filled from the
 * record the moment it shows. It used to reset itself in an effect as it
 * opened, which wiped what was already typed when the effect landed late.
 */
export function ProductFormSheet(props: Parameters<typeof ProductForm>[0]) {
  const opening = useOpeningKey(props.isOpen);
  return <ProductForm key={opening} {...props} />;
}
