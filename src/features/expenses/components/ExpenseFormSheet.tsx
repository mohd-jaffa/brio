"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { FormSheet } from "@/components/ui/form-sheet";
import { useResponse } from "@/components/ui/response-card";
import { optionsFrom, optionsOf, SelectField, TextField } from "@/components/ui/text-field";
import { UI_TEXT } from "@/constants/messages";
import { useOpeningKey } from "@/hooks/useOpeningKey";
import {
  EXPENSE_CATEGORIES,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
} from "@/constants/statuses";
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
import type { Expense } from "../types";

function valuesOf(expense?: Expense): ExpenseFormValues {
  if (!expense) {
    return {
      category: "Ingredients",
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
  onSuccess,
  initialData,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Expense;
}) {
  // Kept out of the React Compiler, as every react-hook-form sheet is (R1.9).
  "use no memo";
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ExpenseFormValues, unknown, ExpenseFormPayload>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: valuesOf(initialData),
  });


  const respond = useResponse();
  const { submit, submitting } = useApiMutation<ExpenseFormPayload, Expense>(
    (values) =>
      initialData
        ? ExpensesClient.updateExpense(initialData.id, values)
        : ExpensesClient.createExpense(values),
    {
      revalidate: [apiRoutes.expenses.list],
      onSuccess: () => {
        onSuccess();
        onClose();
        respond.success({ title: UI_TEXT.outcomes.expenseSaved });
      },
      // A refusal is a card over the sheet, which stays open to be put right.
      onError: (failure) =>
        respond.failure(failure, { title: UI_TEXT.outcomes.expenseNotSaved, fallback: "SAVE_FAILED" }),
    },
  );

  return (
    <FormSheet
      open={isOpen}
      title={initialData ? "Edit Expense" : "New Expense"}
      onClose={onClose}
      onSubmit={handleSubmit((values) => submit(values))}
      submitLabel="Save Expense"
      submitting={submitting}
    >
      <SelectField
        label="Category"
        required
        options={optionsOf(EXPENSE_CATEGORIES)}
        error={errors.category?.message}
        {...register("category")}
      />
      <TextField
        label="Description"
        required
        placeholder="e.g. Flour and Sugar"
        error={errors.description?.message}
        {...register("description")}
      />

      <div className="grid grid-cols-2 gap-4">
        <TextField
          label="Amount (₹)"
          required
          inputMode="decimal"
          placeholder="0.00"
          error={errors.amount?.message}
          {...register("amount")}
        />
        <TextField
          label="Date"
          required
          type="date"
          error={errors.expenseDate?.message}
          {...register("expenseDate")}
        />
      </div>

      <SelectField
        label="Paid With"
        required
        options={optionsFrom(PAYMENT_METHODS, PAYMENT_METHOD_LABELS)}
        error={errors.paymentMethod?.message}
        {...register("paymentMethod")}
      />
    </FormSheet>
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
