"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { Controller, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { FormSheet } from "@/components/ui/form-sheet";
import { useResponse } from "@/components/ui/response-card";
import { optionsFrom, SelectField, TextField } from "@/components/ui/text-field";
import { UI_TEXT } from "@/constants/messages";
import { DEFAULT_EXPENSE_CATEGORIES, PAYMENT_METHOD_LABELS, PAYMENT_METHODS } from "@/constants/statuses";
import { useDisclosure } from "@/hooks/useDisclosure";
import { useOpeningKey } from "@/hooks/useOpeningKey";
import { formatPaise } from "@/lib/format/currency";
import { todayKey } from "@/lib/dates/calendar";
import { paiseToRupees } from "@/lib/money";
import { apiRoutes } from "@/lib/query/keys";
import { useApiMutation } from "@/lib/query/useApiMutation";
import {
  expenseFormSchema,
  type ExpenseFormPayload,
  type ExpenseFormValues,
} from "@/lib/validation";

import { ExpensesClient } from "../api.client";
import { useExpenseCategories } from "../hooks/useExpenseCategories";
import type { Expense } from "../types";
import { ExpenseCategorySheet } from "./ExpenseCategorySheet";
import { CategoryTile } from "./ExpenseRow";

const text = UI_TEXT.expenses.form;

function valuesOf(expense?: Expense): ExpenseFormValues {
  if (!expense) {
    return {
      category: DEFAULT_EXPENSE_CATEGORIES[0],
      description: "",
      amount: "",
      // The business's today, not UTC's: before 05:30 in India that is still yesterday.
      expenseDate: todayKey(),
      paymentMethod: "CASH",
    };
  }
  return {
    category: expense.category,
    description: expense.description,
    amount: paiseToRupees(expense.amount).toFixed(2),
    expenseDate: expense.expenseDate,
    paymentMethod: expense.paymentMethod,
  };
}

function ExpenseForm({
  isOpen,
  onClose,
  initialData,
}: {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Expense;
}) {
  // Kept out of the React Compiler, as every react-hook-form sheet is (R1.9).
  "use no memo";
  const {
    register,
    control,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<ExpenseFormValues, unknown, ExpenseFormPayload>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: valuesOf(initialData),
  });
  const { names, iconOf } = useExpenseCategories();
  const adding = useDisclosure();

  const respond = useResponse();
  const { submit, submitting } = useApiMutation<ExpenseFormPayload, Expense>(
    (values) =>
      initialData
        ? ExpensesClient.updateExpense(initialData.id, values)
        : ExpensesClient.createExpense(values),
    {
      revalidate: [apiRoutes.expenses.list, apiRoutes.expenses.summary],
      onSuccess: () => {
        onClose();
        respond.success({ title: UI_TEXT.outcomes.expenseSaved });
      },
      // A refusal is a card over the sheet, which stays open to be put right.
      onError: (failure) =>
        respond.failure(failure, { title: UI_TEXT.outcomes.expenseNotSaved, fallback: "SAVE_FAILED" }),
    },
  );
  const remove = useApiMutation<Expense, { deleted: true }>((expense) => ExpensesClient.deleteExpense(expense.id), {
    revalidate: [apiRoutes.expenses.list, apiRoutes.expenses.summary],
    onSuccess: () => {
      onClose();
      respond.success({ title: UI_TEXT.outcomes.expenseDeleted });
    },
    onError: (failure) =>
      respond.failure(failure, { title: UI_TEXT.outcomes.expenseNotDeleted, fallback: "SAVE_FAILED" }),
  });
  const confirmDelete = async (expense: Expense) => {
    const sure = await respond.confirm({
      title: UI_TEXT.expenses.confirmDeleteExpense,
      message: UI_TEXT.expenses.confirmDeleteExpenseNote(expense.description, formatPaise(expense.amount)),
      confirmLabel: UI_TEXT.expenses.delete,
      tone: "danger",
    });
    if (sure) await remove.submit(expense);
  };

  return (
    <>
      <FormSheet
        open={isOpen}
        title={initialData ? text.editTitle : text.newTitle}
        onClose={onClose}
        onSubmit={handleSubmit((values) => submit(values))}
        submitLabel={text.save}
        submitting={submitting}
      >
        {/*
          Each category, the business's own too, with its picture (plan §139.11.10); one is always chosen.
          + at the end makes a new one on the spot, and chooses it (the user, 2026-09-26).
        */}
        <fieldset>
          <legend className="mb-2 block text-sm font-medium text-text">{text.category}</legend>
          <ul role="list" className="grid grid-cols-4 gap-2">
            {names.map((category) => (
              <li key={category}>
                <label className="flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl border border-transparent p-1.5 text-center transition-colors hover:bg-surface-hover has-[:checked]:border-primary has-[:checked]:bg-primary-soft has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary">
                  <input type="radio" value={category} className="sr-only" {...register("category")} />
                  <CategoryTile iconKey={iconOf(category)} />
                  <span className="w-full truncate text-xs font-medium text-text">{category}</span>
                </label>
              </li>
            ))}
            <li>
              <button
                type="button"
                aria-label={UI_TEXT.expenses.newCategory}
                onClick={() => adding.open()}
                className="flex w-full flex-col items-center gap-1.5 rounded-2xl p-1.5 text-center transition-colors hover:bg-surface-hover"
              >
                <span
                  aria-hidden="true"
                  className="inline-flex size-10 items-center justify-center rounded-xl border border-dashed border-border text-text-muted"
                >
                  <Plus size={20} strokeWidth={1.75} />
                </span>
                <span className="w-full truncate text-xs font-medium text-primary">{UI_TEXT.expenses.newCategoryShort}</span>
              </button>
            </li>
          </ul>
          <FieldError message={errors.category?.message} />
        </fieldset>
        <TextField
          label={text.description}
          required
          placeholder={text.descriptionPlaceholder}
          error={errors.description?.message}
          {...register("description")}
        />

        <div className="grid grid-cols-2 gap-4">
          <TextField
            label={text.amount}
            required
            inputMode="decimal"
            placeholder={UI_TEXT.fields.amountPlaceholder}
            error={errors.amount?.message}
            {...register("amount")}
          />
          <TextField
            label={text.date}
            required
            type="date"
            error={errors.expenseDate?.message}
            {...register("expenseDate")}
          />
        </div>

        <Controller
          control={control}
          name="paymentMethod"
          render={({ field }) => (
            <SelectField
              label={text.paidWith}
              required
              options={optionsFrom(PAYMENT_METHODS, PAYMENT_METHOD_LABELS)}
              error={errors.paymentMethod?.message}
              {...field}
            />
          )}
        />
        {initialData && (
          <Button
            label={UI_TEXT.expenses.deleteExpense}
            icon={Trash2}
            variant="ghost"
            fullWidth
            loading={remove.submitting}
            onClick={() => void confirmDelete(initialData)}
          />
        )}
      </FormSheet>
      <ExpenseCategorySheet
        isOpen={adding.isOpen}
        onClose={adding.close}
        onSaved={(saved) => setValue("category", saved.category, { shouldDirty: true })}
      />
    </>
  );
}

/**
 * A fresh form for each opening (src/hooks/useOpeningKey.ts), filled from the
 * record the moment it shows. It used to reset itself in an effect as it
 * opened, which wiped what was already typed when the effect landed late.
 */
export function ExpenseFormSheet(props: Parameters<typeof ExpenseForm>[0]) {
  const opening = useOpeningKey(props.isOpen);
  return <ExpenseForm key={opening} {...props} />;
}
