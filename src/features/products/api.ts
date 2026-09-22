import { type SupabaseClient } from "@supabase/supabase-js";
import { type Product, type ProductRow } from "./types";
import {
  createProductSchema,
  updateProductSchema,
  type CreateProductInput,
  type UpdateProductInput,
} from "@/lib/validation";
import { logActionSafe } from "@/features/audit/api";
import { fromPostgrestError } from "@/lib/errors/fromSupabaseError";
import { requireRow } from "@/lib/supabase/writes";
import { pickColumns } from "@/lib/supabase/columns";
import { EDITABLE_COLUMNS } from "@/constants/editableColumns";

function mapRowToModel(row: ProductRow): Product {
  return {
    id: row.id,
    categoryId: row.category_id ?? undefined,
    name: row.name,
    description: row.description ?? undefined,
    defaultPrice: row.default_price,
    unit: row.unit,
    image: row.image ?? undefined,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Reads all products for a tenant, sorted by name.
 */
export async function getAllProducts(client: SupabaseClient, bakeryId: string): Promise<Product[]> {
  const { data, error } = await client
    .from("products")
    .select("*")
    .eq("bakery_id", bakeryId)
    .order("name");

  if (error) throw fromPostgrestError(error);
  return (data as ProductRow[]).map(mapRowToModel);
}

/**
 * Reads a single product by id.
 */
export async function getProductById(client: SupabaseClient, bakeryId: string, id: string): Promise<Product> {
  const { data, error } = await client
    .from("products")
    .select("*")
    .eq("bakery_id", bakeryId)
    .eq("id", id)
    .maybeSingle();

  if (error) throw fromPostgrestError(error);
  const row = await requireRow<ProductRow>(
    Promise.resolve({ data, error: null } as any),
    "RECORD_NOT_FOUND"
  );
  return mapRowToModel(row);
}

/**
 * Creates a new product row.
 */
export async function createProduct(
  client: SupabaseClient, 
  bakeryId: string, 
  input: CreateProductInput
): Promise<Product> {
  const validated = createProductSchema.parse(input);

  const { data, error } = await client
    .from("products")
    .insert({ 
      category_id: validated.categoryId || null,
      name: validated.name,
      description: validated.description || null,
      default_price: validated.defaultPrice,
      unit: validated.unit,
      is_active: validated.isActive,
      bakery_id: bakeryId 
    })
    .select()
    .single();

  if (error) throw fromPostgrestError(error);
  const row = data as ProductRow;

  await logActionSafe(client, {
    bakery_id: bakeryId,
    user_id: null,
    action: "CREATE",
    entity_type: "products",
    entity_id: row.id,
    new_data: row as unknown as Record<string, any>,
  });

  return mapRowToModel(row);
}

/**
 * Updates an existing product using pickColumns and requireRow.
 */
export async function updateProduct(
  client: SupabaseClient,
  bakeryId: string,
  id: string,
  input: UpdateProductInput,
): Promise<Product> {
  const validated = updateProductSchema.parse(input);
  const previousRow = await getProductById(client, bakeryId, id);

  const rawPatch: Partial<Record<string, any>> = {};
  if (validated.categoryId !== undefined) rawPatch.category_id = validated.categoryId || null;
  if (validated.name !== undefined) rawPatch.name = validated.name;
  if (validated.description !== undefined) rawPatch.description = validated.description || null;
  if (validated.defaultPrice !== undefined) rawPatch.default_price = validated.defaultPrice;
  if (validated.unit !== undefined) rawPatch.unit = validated.unit;
  if (validated.isActive !== undefined) rawPatch.is_active = validated.isActive;

  const patch = pickColumns(rawPatch, EDITABLE_COLUMNS.products);

  const row = await requireRow<ProductRow>(
    client
      .from("products")
      .update(patch)
      .eq("bakery_id", bakeryId)
      .eq("id", id)
      .select()
      .maybeSingle(),
    "RECORD_NOT_FOUND"
  );

  await logActionSafe(client, {
    bakery_id: bakeryId,
    user_id: null,
    action: "UPDATE",
    entity_type: "products",
    entity_id: row.id,
    previous_data: previousRow as unknown as Record<string, any>,
    new_data: row as unknown as Record<string, any>,
  });

  return mapRowToModel(row);
}
