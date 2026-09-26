import { apiRoutes } from "@/lib/query/keys";
import { patchJson, postJson } from "@/lib/api/client";
import type { CreateProductInput, UpdateProductInput } from "@/lib/validation";

import type { Product } from "./types";

export const ProductsClient = {
  createProduct: (payload: CreateProductInput) => postJson<Product>(apiRoutes.products.list, payload),
  updateProduct: (id: string, payload: UpdateProductInput) =>
    patchJson<Product>(apiRoutes.products.detail(id), payload),
};
