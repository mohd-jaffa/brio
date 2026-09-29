import { apiRoutes } from "@/lib/query/keys";
import { getJson, patchJson, postJson } from "@/lib/api/client";
import type { CreateCustomerInput, UpdateCustomerInput } from "@/lib/validation";

import type { Customer } from "./types";

/** What the browser may ask the API about customers. */
export const CustomersClient = {
  get: (id: string) => getJson<Customer>(apiRoutes.customers.detail(id)),
  createCustomer: (payload: CreateCustomerInput) => postJson<Customer>(apiRoutes.customers.list, payload),
  updateCustomer: (id: string, payload: UpdateCustomerInput) =>
    patchJson<Customer>(apiRoutes.customers.detail(id), payload),
};
