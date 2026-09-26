"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";

import { FormSheet } from "@/components/ui/form-sheet";
import { PictureField } from "@/components/ui/picture-field";
import { useResponse } from "@/components/ui/response-card";
import { TextField } from "@/components/ui/text-field";
import { DEFAULT_EXPENSE_ILLUSTRATION } from "@/constants/illustrations";
import { MAX_EXPENSE_CATEGORY_NAME } from "@/constants/limits";
import { UI_TEXT } from "@/constants/messages";
import { useOpeningKey } from "@/hooks/useOpeningKey";
import { apiRoutes } from "@/lib/query/keys";
import { useApiMutation } from "@/lib/query/useApiMutation";
import {
  expenseCategoryFormSchema,
  type ExpenseCategoryFormInput,
  type ExpenseCategoryFormPayload,
} from "@/lib/validation";

import { ExpensesClient } from "../api.client";
import type { ExpenseCategoryItem } from "../types";

const text = UI_TEXT.expenses.categoryForm;

interface CategorySheetProps {
  isOpen: boolean;
  onClose: () => void;
  /** One of the business's own being edited; none adds one. */
  category?: ExpenseCategoryItem;
  /** The category as saved — the expense form chooses one made from it. */
  onSaved?: (saved: ExpenseCategoryItem) => void;
}

function CategoryForm({ isOpen, onClose, category, onSaved }: CategorySheetProps) {
  // Kept out of the React Compiler, as every react-hook-form sheet is (R1.9).
  "use no memo";
  const {
    register,
    control,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<ExpenseCategoryFormInput, unknown, ExpenseCategoryFormPayload>({
    resolver: zodResolver(expenseCategoryFormSchema),
    defaultValues: { name: category?.category ?? "", iconKey: category?.iconKey ?? null },
  });
  const icon = useWatch({ control, name: "iconKey" });

  const respond = useResponse();
  const { submit, submitting } = useApiMutation<ExpenseCategoryFormPayload, ExpenseCategoryItem>(
    (values) =>
      category ? ExpensesClient.updateCategory(category.category, values) : ExpensesClient.createCategory(values),
    {
      // A rename moves the category's expenses, so every list of them is read again.
      revalidate: [apiRoutes.expenseCategories.list, apiRoutes.expenses.summary, apiRoutes.expenses.list],
      onSuccess: (saved) => {
        onSaved?.(saved);
        onClose();
        respond.success({ title: category ? UI_TEXT.outcomes.categorySaved : UI_TEXT.outcomes.categoryAdded });
      },
      // A refusal — a name already taken — is a card over the sheet, which stays open to be put right.
      onError: (failure) =>
        respond.failure(failure, {
          title: category ? UI_TEXT.outcomes.categoryNotSaved : UI_TEXT.outcomes.categoryNotAdded,
          fallback: "SAVE_FAILED",
        }),
    },
  );

  return (
    <FormSheet
      open={isOpen}
      title={category ? text.editTitle(category.category) : text.title}
      onClose={onClose}
      onSubmit={handleSubmit((values) => submit(values))}
      submitLabel={category ? text.save : text.add}
      submitting={submitting}
    >
      <PictureField
        value={icon}
        fallback={DEFAULT_EXPENSE_ILLUSTRATION}
        onChange={(key) => setValue("iconKey", key, { shouldDirty: true })}
      />
      <TextField
        label={text.name}
        required
        placeholder={text.namePlaceholder}
        hint={category ? undefined : text.hint}
        maxLength={MAX_EXPENSE_CATEGORY_NAME}
        error={errors.name?.message}
        {...register("name")}
      />
    </FormSheet>
  );
}

/**
 * A category of the business's own, its name and its picture (plan
 * §139.11.10; the user, 2026-09-26): a new one, or one being edited. The
 * eight defaults never open here — they are not changed. A fresh form for
 * each opening (useOpeningKey).
 */
export function ExpenseCategorySheet(props: CategorySheetProps) {
  const opening = useOpeningKey(props.isOpen);
  return <CategoryForm key={opening} {...props} />;
}
