import { fetcher } from "@/shared/api/client";
import { type Customer } from "@/features/customers/types";
import { type CreateCustomerInput, type UpdateCustomerInput } from "@/lib/validation";

export const CustomersClient = {
  async createCustomer(payload: CreateCustomerInput): Promise<{ id: string }> {
    return fetcher<{ id: string }>("/api/customers", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateCustomer(id: string, payload: UpdateCustomerInput): Promise<void> {
    return fetcher(`/api/customers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
};
