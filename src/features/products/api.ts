import type { Tenant } from "@/lib/supabase/tenant";

import { EDITABLE_COLUMNS } from "@/constants/editableColumns";
import { fromPostgrestError } from "@/lib/errors/fromSupabaseError";
import { blankToNull, definedOnly } from "@/lib/supabase/columns";
import { tenantRecords } from "@/lib/supabase/records";
import type { CreateProductPayload, UpdateProductPayload } from "@/lib/validation";

import type { Product, ProductRow } from "./types";

/** A bakery's products — the menu orders are built from (AGENTS.md §6). */
const products = (tenant: Tenant) =>
  tenantRecords<ProductRow>(tenant, "products");

export function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
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
    name: input.name,
    description: blankToNull(input.description),
    default_price: input.defaultPrice,
    unit: input.unit,
    icon_key: input.iconKey,
    is_active: input.isActive,
  });
}

export async function getAllProducts(tenant: Tenant): Promise<Product[]> {
  const rows = await products(tenant).list([{ column: "name" }]);
  return rows.map(toProduct);
}

export async function getProductById(
  tenant: Tenant,
  id: string,
): Promise<Product> {
  return toProduct(await products(tenant).find(id));
}

/**
 * Several of this business's products in one query — an order's lines. A
 * product another business owns, or none owns, is simply not returned.
 */
export async function getProductsByIds(tenant: Tenant, ids: readonly string[]): Promise<Product[]> {
  if (ids.length === 0) return [];
  const { supabase: client, bakeryId } = tenant;
  const { data, error } = await client
    .from("products")
    .select("*")
    .eq("bakery_id", bakeryId)
    .in("id", [...new Set(ids)]);
  if (error) throw fromPostgrestError(error);
  return ((data ?? []) as ProductRow[]).map(toProduct);
}

export async function createProduct(
  tenant: Tenant,
  input: CreateProductPayload,
): Promise<Product> {
  return toProduct(await products(tenant).insert(toColumns(input)));
}

export async function updateProduct(
  tenant: Tenant,
  id: string,
  input: UpdateProductPayload,
): Promise<Product> {
  const row = await products(tenant).update(id, toColumns(input), EDITABLE_COLUMNS.products);
  return toProduct(row);
}
