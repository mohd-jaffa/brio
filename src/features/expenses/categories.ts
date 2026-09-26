import { isIllustrationKey } from "@/constants/illustrations";
import { DEFAULT_EXPENSE_CATEGORIES, isDefaultExpenseCategory, type ExpenseCategory } from "@/constants/statuses";
import { logActionSafe } from "@/lib/audit/auditLog";
import { fromPostgrestError } from "@/lib/errors/fromSupabaseError";
import { requireRow } from "@/lib/supabase/writes";
import type { Tenant } from "@/lib/supabase/tenant";
import type { ExpenseCategoryFormPayload } from "@/lib/validation";

import type { ExpenseCategoryItem } from "./types";

/**
 * A category as the screens know it: whether the business made it, and its
 * picture from the map — always the default for one of the eight, which
 * never change.
 */
function toItem(category: ExpenseCategory, map: unknown): ExpenseCategoryItem {
  const custom = !isDefaultExpenseCategory(category);
  const key = custom ? ((map ?? {}) as Record<string, unknown>)[category] : null;
  return {
    category,
    // A key the library no longer has shows the default, never a broken picture.
    iconKey: typeof key === "string" && isIllustrationKey(key) ? key : null,
    custom,
  };
}

async function readIcons(tenant: Tenant): Promise<unknown> {
  const row = await requireRow<{ expense_category_icons: unknown }>(
    tenant.supabase.from("bakeries").select("expense_category_icons").eq("id", tenant.bakeryId).maybeSingle(),
    "RECORD_NOT_FOUND",
  );
  return row.expense_category_icons;
}

/** One of the category functions of 0020, its refusal in the app's own words. */
async function call<T>(tenant: Tenant, name: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await tenant.supabase.rpc(name, args);
  if (error) throw fromPostgrestError(error);
  return data as T;
}

/** What a category function answers: the business's own category, and its picture. */
interface CategoryRow {
  id: string;
  name: string;
  icon_key?: string | null;
}

/** The names of the categories the business made, oldest first; RLS keeps them to its own. */
export async function customCategoryNames(tenant: Tenant): Promise<string[]> {
  const { data, error } = await tenant.supabase
    .from("expense_categories")
    .select("name")
    .eq("bakery_id", tenant.bakeryId)
    .order("created_at", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw fromPostgrestError(error);
  return ((data ?? []) as { name: string }[]).map((row) => row.name);
}

/**
 * The business's expense categories (`GET /api/expense-categories`, plan
 * §139.11.10): the eight defaults, then the ones it made, each with its
 * picture. Another business's never appear.
 */
export async function listCategories(tenant: Tenant): Promise<ExpenseCategoryItem[]> {
  const [icons, custom] = await Promise.all([readIcons(tenant), customCategoryNames(tenant)]);
  return [...DEFAULT_EXPENSE_CATEGORIES, ...custom].map((category) => toItem(category, icons));
}

/**
 * A category of the business's own, with its picture (`POST
 * /api/expense-categories`; the user, 2026-09-26). Its name is unique within
 * the business, whatever its case, and is not one of the defaults — the
 * schema says so first, `create_expense_category` (0020) makes sure.
 */
export async function createCategory(tenant: Tenant, input: ExpenseCategoryFormPayload): Promise<ExpenseCategoryItem> {
  const row = await call<CategoryRow>(tenant, "create_expense_category", { p_name: input.name, p_icon_key: input.iconKey });
  await logActionSafe(tenant, {
    action: "CREATE",
    entity_type: "expense_categories",
    entity_id: row.id,
    previous_data: null,
    new_data: { ...row },
  });
  return toItem(row.name, { [row.name]: row.icon_key });
}

/**
 * One of the business's own categories renamed, or its picture changed
 * (`PATCH /api/expense-categories/{category}`). A rename takes its expenses
 * and its picture with it, in one transaction; the eight defaults are never
 * changed (`update_expense_category`, 0020).
 */
export async function updateCategory(
  tenant: Tenant,
  category: ExpenseCategory,
  input: ExpenseCategoryFormPayload,
): Promise<ExpenseCategoryItem> {
  const before = toItem(category, await readIcons(tenant));
  const row = await call<CategoryRow>(tenant, "update_expense_category", {
    p_category: category,
    p_name: input.name,
    p_icon_key: input.iconKey,
  });
  await logActionSafe(tenant, {
    action: "UPDATE",
    entity_type: "expense_categories",
    entity_id: row.id,
    previous_data: { name: before.category, icon_key: before.iconKey },
    new_data: { name: row.name, icon_key: row.icon_key },
  });
  return toItem(row.name, { [row.name]: row.icon_key });
}

/**
 * One of the business's own categories deleted (`DELETE
 * /api/expense-categories/{category}`) — never a default, and never one an
 * expense is filed under (`delete_expense_category`, 0020).
 */
export async function deleteCategory(tenant: Tenant, category: ExpenseCategory): Promise<{ deleted: true }> {
  const row = await call<CategoryRow>(tenant, "delete_expense_category", { p_category: category });
  await logActionSafe(tenant, {
    action: "DELETE",
    entity_type: "expense_categories",
    entity_id: row.id,
    previous_data: { ...row },
    new_data: null,
  });
  return { deleted: true };
}
