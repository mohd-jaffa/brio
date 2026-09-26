import { withBakeryRoute } from "@/features/auth/guard";
import { createCategory, listCategories } from "@/features/expenses/categories";
import { readJson } from "@/lib/api/handler";
import { expenseCategoryFormSchema } from "@/lib/validation";

export const runtime = "nodejs";

/** The business's expense categories, the eight defaults then its own, each with its picture (plan §139.11.10). */
export async function GET(request: Request) {
  return withBakeryRoute(request, (tenant) => listCategories(tenant));
}

/** A category of the business's own: `{ name, iconKey }` (the user, 2026-09-26). */
export async function POST(request: Request) {
  return withBakeryRoute(
    request,
    async (tenant) => createCategory(tenant, await readJson(request, expenseCategoryFormSchema)),
    { successStatus: 201 },
  );
}
