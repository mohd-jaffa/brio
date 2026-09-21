import { type SupabaseClient } from "@supabase/supabase-js";
import { type ProductRow } from "./products.types";
import { ExternalServiceError, NotFoundError } from "@/shared/errors/app-error";
import { ERROR_CODES } from "@/shared/constants/errors";

export class ProductsRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findAll(bakeryId: string): Promise<ProductRow[]> {
    const { data, error } = await this.client
      .from("products")
      .select("*")
      .eq("bakery_id", bakeryId)
      .order("name");

    if (error) {
      throw this.mapDatabaseError(error);
    }

    return data as ProductRow[];
  }

  async findById(bakeryId: string, id: string): Promise<ProductRow> {
    const { data, error } = await this.client
      .from("products")
      .select("*")
      .eq("bakery_id", bakeryId)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw this.mapDatabaseError(error);
    }

    if (!data) {
      throw new NotFoundError(ERROR_CODES.NOT_FOUND, "Product not found");
    }

    return data as ProductRow;
  }

  async create(bakeryId: string, payload: Partial<ProductRow>): Promise<ProductRow> {
    const { data, error } = await this.client
      .from("products")
      .insert({ ...payload, bakery_id: bakeryId })
      .select()
      .single();

    if (error) {
      throw this.mapDatabaseError(error);
    }

    return data as ProductRow;
  }

  async update(bakeryId: string, id: string, payload: Partial<ProductRow>): Promise<ProductRow> {
    const { data, error } = await this.client
      .from("products")
      .update(payload)
      .eq("bakery_id", bakeryId)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) {
      throw this.mapDatabaseError(error);
    }

    if (!data) {
      throw new NotFoundError(ERROR_CODES.NOT_FOUND, "Product not found");
    }

    return data as ProductRow;
  }

  private mapDatabaseError(error: unknown) {
    return new ExternalServiceError(ERROR_CODES.EXTERNAL_SERVICE_ERROR, undefined, error);
  }
}
