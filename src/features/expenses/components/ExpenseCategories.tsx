"use client";

import { ListFilter, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { shares } from "@/components/ui/charts/geometry";
import { IllustrationPicker } from "@/components/ui/illustration-picker";
import { lazySheet } from "@/components/ui/lazy-sheet";
import { useResponse } from "@/components/ui/response-card";
import { Row, RowList } from "@/components/ui/row";
import { Sheet } from "@/components/ui/sheet";
import { DEFAULT_EXPENSE_ILLUSTRATION, type IllustrationKey } from "@/constants/illustrations";
import { UI_TEXT } from "@/constants/messages";
import { isDefaultExpenseCategory, type ExpenseCategory } from "@/constants/statuses";
import { useDisclosure } from "@/hooks/useDisclosure";
import { useKept } from "@/hooks/useKept";
import { formatPaise } from "@/lib/format/currency";
import { apiRoutes } from "@/lib/query/keys";
import { useApiMutation } from "@/lib/query/useApiMutation";

import { ExpensesClient } from "../api.client";
import type { ExpenseCategoryItem, ExpenseSummary } from "../types";
import { CategoryTile } from "./ExpenseRow";

/** Kept out of the screen's first download, and fetched once it is idle (`lazySheet`). */
const ExpenseCategorySheet = lazySheet(
  () => import("./ExpenseCategorySheet").then((module) => module.ExpenseCategorySheet),
  (props) => props.isOpen,
);

const text = UI_TEXT.expenses;

/**
 * What can be done to one of the business's own categories: see its
 * expenses, change its name and picture, and delete it — which the server
 * refuses while any expense is filed under it (0020).
 */
function CategoryActions({
  category,
  onClose,
  onOpen,
  onEdit,
}: {
  category: ExpenseCategoryItem | undefined;
  onClose: () => void;
  onOpen: (category: ExpenseCategory) => void;
  onEdit: (category: ExpenseCategoryItem) => void;
}) {
  // It leaves showing the category it opened for.
  const shown = useKept(category, category !== undefined);
  const respond = useResponse();
  const remove = useApiMutation<ExpenseCategory, { deleted: true }>((name) => ExpensesClient.deleteCategory(name), {
    revalidate: [apiRoutes.expenseCategories.list, apiRoutes.expenses.summary],
    onSuccess: () => respond.success({ title: UI_TEXT.outcomes.categoryDeleted }),
    onError: (failure) =>
      respond.failure(failure, { title: UI_TEXT.outcomes.categoryNotDeleted, fallback: "SAVE_FAILED" }),
  });

  const confirmDelete = async (name: ExpenseCategory) => {
    const sure = await respond.confirm({
      title: text.confirmDeleteCategory(name),
      message: text.confirmDeleteCategoryNote,
      confirmLabel: text.delete,
      tone: "danger",
    });
    if (sure) await remove.submit(name);
  };

  return (
    <Sheet open={category !== undefined} onClose={onClose} title={shown?.category ?? text.categories}>
      {shown && (
        <ul className="space-y-2 pb-2">
          {[
            { label: text.categoryActions.see, icon: ListFilter, run: () => onOpen(shown.category) },
            { label: text.categoryActions.edit, icon: Pencil, run: () => onEdit(shown) },
            { label: text.categoryActions.delete, icon: Trash2, run: () => void confirmDelete(shown.category) },
          ].map((action) => (
            <li key={action.label}>
              <Button
                label={action.label}
                icon={action.icon}
                variant="ghost"
                fullWidth
                onClick={() => {
                  onClose();
                  action.run();
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}

/**
 * Categories (plan §139.10, §139.11.10): the eight defaults and the
 * business's own, the largest first, each with its picture, the period's
 * total, its count and its share. The eight never change (the user,
 * 2026-09-26): tapping one opens its expenses. One of the business's own
 * has its picture tapped to change it — every expense in it shows the new
 * one — and its row offers its expenses, editing it and deleting it. **New
 * category** adds one.
 */
export function ExpenseCategories({
  summary,
  iconOf,
  onOpenCategory,
}: {
  summary: ExpenseSummary;
  iconOf: (category: ExpenseCategory) => string | null;
  onOpenCategory: (category: ExpenseCategory) => void;
}) {
  const respond = useResponse();
  // The category whose picture is being chosen; it stays set as the picker closes, so the sheet leaves as it came.
  const [picking, setPicking] = useState<{ category: ExpenseCategory; open: boolean }>({ category: "", open: false });
  const [acting, setActing] = useState<ExpenseCategoryItem | undefined>();
  const editing = useDisclosure<ExpenseCategoryItem>();
  const change = useApiMutation<{ category: ExpenseCategory; iconKey: IllustrationKey }, ExpenseCategoryItem>(
    ({ category, iconKey }) => ExpensesClient.setCategoryIcon(category, iconKey),
    {
      revalidate: [apiRoutes.expenseCategories.list],
      onSuccess: () => respond.success({ title: UI_TEXT.outcomes.pictureSaved }),
      onError: (failure) =>
        respond.failure(failure, { title: UI_TEXT.outcomes.pictureNotSaved, fallback: "SAVE_FAILED" }),
    },
  );
  const percents = shares(summary.byCategory.map((category) => category.total));

  return (
    <div className="space-y-4">
      <RowList label={text.categories}>
        {summary.byCategory.map((category, index) => {
          const line = {
            title: category.category,
            subtitle: text.categoryLine(category.count, percents[index]),
            trailing: <span className="tabular-nums">{formatPaise(category.total)}</span>,
          };
          return isDefaultExpenseCategory(category.category) ? (
            <Row
              key={category.category}
              leading={<CategoryTile iconKey={null} />}
              {...line}
              onClick={() => onOpenCategory(category.category)}
            />
          ) : (
            <Row
              key={category.category}
              leadingControl={
                <button
                  type="button"
                  aria-label={text.changePicture(category.category)}
                  onClick={() => setPicking({ category: category.category, open: true })}
                  className="block rounded-xl transition-opacity hover:opacity-80"
                >
                  <CategoryTile iconKey={iconOf(category.category)} />
                </button>
              }
              {...line}
              onClick={() =>
                setActing({
                  category: category.category,
                  iconKey: iconOf(category.category) as IllustrationKey | null,
                  custom: true,
                })
              }
            />
          );
        })}
      </RowList>
      <Button label={text.newCategory} icon={Plus} variant="secondary" onClick={() => editing.open()} />

      <CategoryActions
        category={acting}
        onClose={() => setActing(undefined)}
        onOpen={onOpenCategory}
        onEdit={editing.open}
      />
      <IllustrationPicker
        open={picking.open}
        onClose={() => setPicking((current) => ({ ...current, open: false }))}
        value={iconOf(picking.category)}
        fallback={DEFAULT_EXPENSE_ILLUSTRATION}
        onPick={(iconKey) => void change.submit({ category: picking.category, iconKey })}
      />
      <ExpenseCategorySheet isOpen={editing.isOpen} onClose={editing.close} category={editing.subject} />
    </div>
  );
}
