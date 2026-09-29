import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { MAX_EXPENSE_CATEGORY_NAME } from "@/constants/limits";
import { DEFAULT_EXPENSE_CATEGORIES } from "@/constants/statuses";

const migration = readFileSync(join(process.cwd(), "supabase/migrations/0020_expense_categories.sql"), "utf8");

/** The body of one of the migration's functions. */
function body(name: string): string {
  const start = migration.indexOf(`create or replace function public.${name}(`);
  return migration.slice(start, migration.indexOf("$$;", start));
}

/**
 * The contract of 0020 (plan §139.11.10; the user, 2026-09-26; R5.16).
 * Proved on the local database as well: the owner adds a category with its
 * picture and files an expense under it; renaming it moves its expenses and
 * its picture; a name already taken, whatever its case, or one of the eight
 * is refused; a default is never changed or deleted, nor one with expenses;
 * and another business's category can be neither seen, used, changed nor
 * deleted.
 */
describe("expense categories migration", () => {
  it("spells the eight as the app does", () => {
    expect(body("default_expense_categories")).toContain(
      `array[${DEFAULT_EXPENSE_CATEGORIES.map((name) => `'${name}'`).join(", ")}]`,
    );
    expect(body("names_default_expense_category")).toContain("lower(d.name) = lower(btrim(p_name))");
  });

  it("keeps a business's own categories to that business, readable only through RLS", () => {
    expect(migration).toMatch(/create table public\.expense_categories \(/);
    expect(migration).toMatch(/bakery_id uuid not null references public\.bakeries\(id\) on delete cascade/);
    expect(migration).toMatch(/alter table public\.expense_categories enable row level security;/);
    expect(migration).toMatch(
      /using \(bakery_id = public\.current_profile_bakery_id\(\)\)\s+with check \(bakery_id = public\.current_profile_bakery_id\(\)\);/,
    );
    expect(migration).toMatch(/revoke all on public\.expense_categories from public, anon, authenticated;/);
    expect(migration).toMatch(/grant select on public\.expense_categories to authenticated;/);
  });

  it("names each once within a business, whatever its case, as long as the app allows and never as a default", () => {
    expect(migration).toMatch(/on public\.expense_categories \(bakery_id, lower\(btrim\(name\)\)\);/);
    expect(migration).toContain(`check (char_length(btrim(name)) between 1 and ${MAX_EXPENSE_CATEGORY_NAME})`);
    expect(migration).toContain("check (not public.names_default_expense_category(name))");
  });

  it("files an expense under a default or one of its own business's categories, locking it against a rename or delete", () => {
    expect(migration).toMatch(/alter table public\.expenses drop constraint expenses_category_check;/);
    expect(migration).toMatch(/before insert or update of category, bakery_id on public\.expenses/);
    const known = body("expense_category_known");
    expect(known).toMatch(/where c\.bakery_id = new\.bakery_id\s+and c\.name = new\.category\s+for share;/);
    expect(known).toContain("hint = 'EXPENSE_CATEGORY_UNKNOWN'");
  });

  it("acts only for the business's owner, with a picture key of the library's shape", () => {
    const owned = body("owned_business_for_categories");
    expect(owned).toContain("b.owner_id = auth.uid()");
    expect(owned).toContain("p_icon_key !~ '^[a-z0-9]+(-[a-z0-9]+)*$'");
    for (const name of ["create_expense_category", "update_expense_category", "delete_expense_category"]) {
      expect(body(name)).toMatch(/security definer\s+set search_path = ''/);
      expect(body(name)).toContain("public.owned_business_for_categories(");
    }
  });

  it("never changes or deletes one of the eight", () => {
    for (const name of ["update_expense_category", "delete_expense_category"]) {
      expect(body(name)).toMatch(
        /if p_category = any \(public\.default_expense_categories\(\)\) then\s+raise exception '[^']+' using errcode = 'P0001', hint = 'EXPENSE_CATEGORY_DEFAULT_FIXED';/,
      );
    }
  });

  it("moves a renamed category's expenses and picture with it, and refuses a name taken", () => {
    const update = body("update_expense_category");
    expect(update).toContain(
      "update public.expenses set category = wanted where bakery_id = business and category = own.name;",
    );
    expect(update).toContain("perform public.put_expense_category_icon(business, own.name, null);");
    expect(update).toContain("hint = 'EXPENSE_CATEGORY_ALREADY_EXISTS'");
    expect(body("create_expense_category")).toContain("hint = 'EXPENSE_CATEGORY_ALREADY_EXISTS'");
  });

  it("deletes only a category no expense is filed under", () => {
    const remove = body("delete_expense_category");
    expect(remove).toMatch(/for update;/);
    expect(remove).toContain("hint = 'EXPENSE_CATEGORY_IN_USE'");
  });

  it("is for a signed-in user only, and keeps its helpers to itself", () => {
    for (const signature of [
      "create_expense_category(text, text)",
      "update_expense_category(text, text, text)",
      "delete_expense_category(text)",
    ]) {
      expect(migration).toContain(`revoke all on function public.${signature} from public, anon;`);
      expect(migration).toContain(`grant execute on function public.${signature} to authenticated;`);
    }
    for (const helper of [
      "expense_category_known()",
      "owned_business_for_categories(text)",
      "put_expense_category_icon(uuid, text, text)",
    ]) {
      expect(migration).toContain(`revoke all on function public.${helper} from public, anon, authenticated;`);
    }
  });
});
