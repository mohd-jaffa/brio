import { apiRoutes } from "@/lib/query/keys";
import { getJson, patchJson, postJson } from "@/lib/api/client";
import type { CreateProductInput, UpdateProductInput } from "@/lib/validation";

import type { Product } from "./types";

export const ProductsClient = {
  list: () => getJson<Product[]>(apiRoutes.products.list),
  get: (id: string) => getJson<Product>(apiRoutes.products.detail(id)),
  createProduct: (payload: CreateProductInput) => postJson<Product>(apiRoutes.products.list, payload),
  updateProduct: (id: string, payload: UpdateProductInput) =>
    patchJson<Product>(apiRoutes.products.detail(id), payload),
};
