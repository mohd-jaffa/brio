import { withBakeryRoute } from "@/features/auth/guard";
import { deleteCategory, updateCategory } from "@/features/expenses/categories";
import { readJson } from "@/lib/api/handler";
import type { RouteParams } from "@/lib/api/params";
import { expenseCategoryFormSchema, expenseCategorySchema } from "@/lib/validation";

export const runtime = "nodejs";

// Next hands the segment over decoded already; a name may hold "%" or a space.
const categoryOf = async (params: RouteParams<"category">["params"]) =>
  expenseCategorySchema.parse((await params).category);

/** One of the business's own categories: `{ name, iconKey }`; the eight are never changed (plan §139.11.10). */
export async function PATCH(request: Request, { params }: RouteParams<"category">) {
  return withBakeryRoute(request, async (tenant) =>
    updateCategory(tenant, await categoryOf(params), await readJson(request, expenseCategoryFormSchema)),
  );
}

/** One of the business's own categories, when no expense is filed under it. */
export async function DELETE(request: Request, { params }: RouteParams<"category">) {
  return withBakeryRoute(request, async (tenant) => deleteCategory(tenant, await categoryOf(params)));
}
