import { type SupabaseClient } from "@supabase/supabase-js";
import { type Product, type ProductRow } from "./types";
import { ExternalServiceError, NotFoundError } from "@/shared/errors/app-error";
import {
  createProductSchema,
  updateProductSchema,
  type CreateProductInput,
  type UpdateProductInput,
} from "@/lib/validation";
import { logActionSafe } from "@/features/audit/api";

function mapDatabaseError(error: unknown) {
  return new ExternalServiceError("EXTERNAL_SERVICE_ERROR", undefined, error);
}

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

export async function getAllProducts(client: SupabaseClient, bakeryId: string): Promise<Product[]> {
  const { data, error } = await client
    .from("products")
    .select("*")
    .eq("bakery_id", bakeryId)
    .order("name");

  if (error) {
    throw mapDatabaseError(error);
  }

  const rows = data as ProductRow[];
  return rows.map(mapRowToModel);
}

export async function getProductById(client: SupabaseClient, bakeryId: string, id: string): Promise<Product> {
  const { data, error } = await client
    .from("products")
    .select("*")
    .eq("bakery_id", bakeryId)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw mapDatabaseError(error);
  }

  if (!data) {
    throw new NotFoundError("NOT_FOUND", "Product not found");
  }

  return mapRowToModel(data as ProductRow);
}

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

  if (error) {
    throw mapDatabaseError(error);
  }

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

export async function updateProduct(
  client: SupabaseClient,
  bakeryId: string,
  id: string,
  input: UpdateProductInput,
): Promise<Product> {
  const validated = updateProductSchema.parse(input);

  const previousRow = await getProductById(client, bakeryId, id);

  const payload: Partial<ProductRow> = {};
  
  if (validated.categoryId !== undefined) payload.category_id = validated.categoryId || null;
  if (validated.name !== undefined) payload.name = validated.name;
  if (validated.description !== undefined) payload.description = validated.description || null;
  if (validated.defaultPrice !== undefined) payload.default_price = validated.defaultPrice;
  if (validated.unit !== undefined) payload.unit = validated.unit;
  if (validated.isActive !== undefined) payload.is_active = validated.isActive;

  const { data, error } = await client
    .from("products")
    .update(payload)
    .eq("bakery_id", bakeryId)
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) {
    throw mapDatabaseError(error);
  }

  if (!data) {
    throw new NotFoundError("NOT_FOUND", "Product not found");
  }

  const row = data as ProductRow;

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
