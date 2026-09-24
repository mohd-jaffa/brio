import type { SupabaseClient } from "@supabase/supabase-js";

import { EDITABLE_COLUMNS } from "@/constants/editableColumns";
import { blankToNull, definedOnly } from "@/lib/supabase/columns";
import { tenantRecords } from "@/lib/supabase/records";
import type { CreateProductPayload, UpdateProductPayload } from "@/lib/validation";

import type { Product, ProductRow } from "./types";

/** A bakery's products — the menu orders are built from (AGENTS.md §6). */
const products = (client: SupabaseClient, bakeryId: string) =>
  tenantRecords<ProductRow>(client, "products", bakeryId);

export function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    categoryId: row.category_id ?? undefined,
    name: row.name,
    description: row.description ?? undefined,
    defaultPrice: row.default_price,
    unit: row.unit,
    iconKey: row.icon_key ?? undefined,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toColumns(input: UpdateProductPayload) {
  return definedOnly({
    category_id: blankToNull(input.categoryId),
    name: input.name,
    description: blankToNull(input.description),
    default_price: input.defaultPrice,
    unit: input.unit,
    icon_key: input.iconKey,
    is_active: input.isActive,
  });
}

export async function getAllProducts(client: SupabaseClient, bakeryId: string): Promise<Product[]> {
  const rows = await products(client, bakeryId).list([{ column: "name" }]);
  return rows.map(toProduct);
}

export async function getProductById(
  client: SupabaseClient,
  bakeryId: string,
  id: string,
): Promise<Product> {
  return toProduct(await products(client, bakeryId).find(id));
}

export async function createProduct(
  client: SupabaseClient,
  bakeryId: string,
  input: CreateProductPayload,
): Promise<Product> {
  return toProduct(await products(client, bakeryId).insert(toColumns(input)));
}

export async function updateProduct(
  client: SupabaseClient,
  bakeryId: string,
  id: string,
  input: UpdateProductPayload,
): Promise<Product> {
  const row = await products(client, bakeryId).update(id, toColumns(input), EDITABLE_COLUMNS.products);
  return toProduct(row);
}
