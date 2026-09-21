import { type SupabaseClient } from "@supabase/supabase-js";
import { ProductsRepository } from "./products.repository";
import { type Product, type ProductRow } from "./products.types";
import {
  createProductSchema,
  updateProductSchema,
  type CreateProductInput,
  type UpdateProductInput,
} from "./products.validation";

export class ProductsService {
  private readonly repository: ProductsRepository;

  constructor(client: SupabaseClient) {
    this.repository = new ProductsRepository(client);
  }

  async getAllProducts(bakeryId: string): Promise<Product[]> {
    const rows = await this.repository.findAll(bakeryId);
    return rows.map(this.mapRowToModel);
  }

  async getProductById(bakeryId: string, id: string): Promise<Product> {
    const row = await this.repository.findById(bakeryId, id);
    return this.mapRowToModel(row);
  }

  async createProduct(bakeryId: string, input: CreateProductInput): Promise<Product> {
    const validated = createProductSchema.parse(input);

    const row = await this.repository.create(bakeryId, {
      category_id: validated.categoryId || null,
      name: validated.name,
      description: validated.description || null,
      default_price: validated.defaultPrice,
      unit: validated.unit,
      is_active: validated.isActive,
    });

    return this.mapRowToModel(row);
  }

  async updateProduct(
    bakeryId: string,
    id: string,
    input: UpdateProductInput,
  ): Promise<Product> {
    const validated = updateProductSchema.parse(input);

    const payload: Partial<ProductRow> = {};
    
    if (validated.categoryId !== undefined) payload.category_id = validated.categoryId || null;
    if (validated.name !== undefined) payload.name = validated.name;
    if (validated.description !== undefined) payload.description = validated.description || null;
    if (validated.defaultPrice !== undefined) payload.default_price = validated.defaultPrice;
    if (validated.unit !== undefined) payload.unit = validated.unit;
    if (validated.isActive !== undefined) payload.is_active = validated.isActive;

    const row = await this.repository.update(bakeryId, id, payload);
    return this.mapRowToModel(row);
  }

  private mapRowToModel(row: ProductRow): Product {
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
}
