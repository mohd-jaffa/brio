import { fetcher } from "@/shared/api/client";
import { type CreateProductInput, type UpdateProductInput } from "@/lib/validation";

export const ProductsClient = {
  async createProduct(payload: CreateProductInput): Promise<{ id: string }> {
    return fetcher<{ id: string }>("/api/products", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateProduct(id: string, payload: UpdateProductInput): Promise<void> {
    return fetcher(`/api/products/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
};
