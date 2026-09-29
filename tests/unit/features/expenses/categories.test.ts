import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createCategory,
  customCategoryNames,
  deleteCategory,
  listCategories,
  updateCategory,
} from "@/features/expenses/categories";
import { AppError } from "@/lib/errors/AppError";
import { fakeSupabase } from "@tests/support/supabase";
import { tenantOf } from "@tests/support/tenant";

const logActionSafe = vi.fn();
vi.mock("@/lib/audit/auditLog", () => ({ logActionSafe: (...args: unknown[]) => logActionSafe(...args) }));

/** A fake client whose `bakeries` row holds `stored`, whose own categories are `custom`, and whose functions answer with `rpc`. */
function clientWith({
  stored = {},
  custom = [],
  rpc = { data: null, error: null },
}: { stored?: unknown; custom?: string[]; rpc?: { data?: unknown; error?: unknown } } = {}) {
  const fake = fakeSupabase((query) =>
    query.table === "bakeries"
      ? { data: { expense_category_icons: stored } }
      : { data: custom.map((name) => ({ name })) },
  );
  const call = vi.fn(async () => ({ data: null, error: null, ...rpc }));
  Object.assign(fake.client, { rpc: call });
  return { ...fake, rpc: call };
}

const refusal = (hint: string) => ({ error: { code: "P0001", hint, message: "refused" } });

beforeEach(() => {
  logActionSafe.mockReset();
});

describe("listCategories", () => {
  it("lists the eight on their fixed picture, then the business's own with theirs", async () => {
    const fake = clientWith({
      // A default's key is never kept, and would not show if it were.
      stored: { Packaging: "shopping-bags", Flowers: "rose-bunch", Ribbons: "retired-key", Bows: 7 },
      custom: ["Flowers", "Ribbons", "Bows"],
    });
    const categories = await listCategories(tenantOf(fake.client));

    expect(categories).toHaveLength(11);
    expect(categories[0]).toEqual({ category: "Ingredients", iconKey: null, custom: false });
    expect(categories.find((item) => item.category === "Packaging")?.iconKey).toBeNull();
    expect(categories[8]).toEqual({ category: "Flowers", iconKey: "rose-bunch", custom: true });
    expect(categories[9].iconKey).toBeNull();
    expect(categories[10].iconKey).toBeNull();

    const icons = fake.queries.find((query) => query.table === "bakeries")!;
    expect(fake.argsOf(icons, "eq")).toEqual([["id", "b-1"]]);
    const own = fake.queries.find((query) => query.table === "expense_categories")!;
    expect(fake.argsOf(own, "eq")).toEqual([["bakery_id", "b-1"]]);
    expect(fake.argsOf(own, "order")).toEqual([
      ["created_at", { ascending: true }],
      ["name", { ascending: true }],
    ]);
  });

  it("reads a business that has made nothing as the eight", async () => {
    const fake = fakeSupabase((query) =>
      query.table === "bakeries" ? { data: { expense_category_icons: null } } : { data: null },
    );
    const categories = await listCategories(tenantOf(fake.client));
    expect(categories).toHaveLength(8);
    expect(categories.every((item) => item.iconKey === null && !item.custom)).toBe(true);
  });

  it("shows the default picture for one of the business's own when no picture is kept at all", async () => {
    const fake = fakeSupabase((query) =>
      query.table === "bakeries" ? { data: { expense_category_icons: null } } : { data: [{ name: "Flowers" }] },
    );
    const categories = await listCategories(tenantOf(fake.client));
    expect(categories.at(-1)).toEqual({ category: "Flowers", iconKey: null, custom: true });
  });
});

describe("customCategoryNames", () => {
  it("turns a failure into the app's own error", async () => {
    const failing = fakeSupabase(() => ({ error: { message: "boom", code: "XX000" } }));
    await expect(customCategoryNames(tenantOf(failing.client))).rejects.toBeInstanceOf(AppError);
  });
});

describe("createCategory", () => {
  it("adds the business's own category with its picture through the owner's function, and audits it", async () => {
    const fake = clientWith({ rpc: { data: { id: "c-1", name: "Flowers", icon_key: "rose-bunch" } } });
    const tenant = tenantOf(fake.client);
    const created = await createCategory(tenant, { name: "Flowers", iconKey: "rose-bunch" });

    expect(created).toEqual({ category: "Flowers", iconKey: "rose-bunch", custom: true });
    expect(fake.rpc).toHaveBeenCalledWith("create_expense_category", { p_name: "Flowers", p_icon_key: "rose-bunch" });
    expect(logActionSafe).toHaveBeenCalledWith(
      tenant,
      expect.objectContaining({
        action: "CREATE",
        entity_type: "expense_categories",
        entity_id: "c-1",
        previous_data: null,
      }),
    );
  });

  it("says when the business already has a category by that name, and audits nothing", async () => {
    const fake = clientWith({ rpc: refusal("EXPENSE_CATEGORY_ALREADY_EXISTS") });
    await expect(createCategory(tenantOf(fake.client), { name: "flowers", iconKey: null })).rejects.toMatchObject({
      code: "EXPENSE_CATEGORY_ALREADY_EXISTS",
      kind: "CONFLICT",
    });
    expect(logActionSafe).not.toHaveBeenCalled();
  });
});

describe("updateCategory", () => {
  it("renames one of the business's own or changes its picture, and audits what it was and is", async () => {
    const fake = clientWith({
      stored: { Flowres: "gift-box" },
      rpc: { data: { id: "c-1", name: "Flowers", icon_key: "rose-bunch" } },
    });
    const tenant = tenantOf(fake.client);
    const item = await updateCategory(tenant, "Flowres", { name: "Flowers", iconKey: "rose-bunch" });

    expect(item).toEqual({ category: "Flowers", iconKey: "rose-bunch", custom: true });
    expect(fake.rpc).toHaveBeenCalledWith("update_expense_category", {
      p_category: "Flowres",
      p_name: "Flowers",
      p_icon_key: "rose-bunch",
    });
    expect(logActionSafe).toHaveBeenCalledWith(
      tenant,
      expect.objectContaining({
        action: "UPDATE",
        entity_type: "expense_categories",
        entity_id: "c-1",
        previous_data: { name: "Flowres", icon_key: "gift-box" },
        new_data: { name: "Flowers", icon_key: "rose-bunch" },
      }),
    );
  });

  it("refuses a default, which never changes, as a business rule", async () => {
    const fake = clientWith({ rpc: refusal("EXPENSE_CATEGORY_DEFAULT_FIXED") });
    await expect(
      updateCategory(tenantOf(fake.client), "Rent", { name: "Home rent", iconKey: null }),
    ).rejects.toMatchObject({
      code: "EXPENSE_CATEGORY_DEFAULT_FIXED",
      kind: "BUSINESS_RULE",
    });
    expect(logActionSafe).not.toHaveBeenCalled();
  });
});

describe("deleteCategory", () => {
  it("deletes one of the business's own, and audits it", async () => {
    const fake = clientWith({ rpc: { data: { id: "c-2", name: "Ribbons" } } });
    const tenant = tenantOf(fake.client);
    expect(await deleteCategory(tenant, "Ribbons")).toEqual({ deleted: true });
    expect(fake.rpc).toHaveBeenCalledWith("delete_expense_category", { p_category: "Ribbons" });
    expect(logActionSafe).toHaveBeenCalledWith(
      tenant,
      expect.objectContaining({
        action: "DELETE",
        entity_id: "c-2",
        previous_data: { id: "c-2", name: "Ribbons" },
        new_data: null,
      }),
    );
  });

  it("refuses one with expenses filed under it, as a business rule", async () => {
    const fake = clientWith({ rpc: refusal("EXPENSE_CATEGORY_IN_USE") });
    await expect(deleteCategory(tenantOf(fake.client), "Flowers")).rejects.toMatchObject({
      code: "EXPENSE_CATEGORY_IN_USE",
      kind: "BUSINESS_RULE",
    });
    expect(logActionSafe).not.toHaveBeenCalled();
  });
});
