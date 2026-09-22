import { type SupabaseClient } from "@supabase/supabase-js";
import { CustomersRepository } from "./repository";
import { type Customer, type CustomerRow } from "./types";
import {
  createCustomerSchema,
  updateCustomerSchema,
  type CreateCustomerInput,
  type UpdateCustomerInput,
} from "@/lib/validation";

export class CustomersService {
  private readonly repository: CustomersRepository;

  constructor(client: SupabaseClient) {
    this.repository = new CustomersRepository(client);
  }

  async getAllCustomers(bakeryId: string): Promise<Customer[]> {
    const rows = await this.repository.findAll(bakeryId);
    return rows.map(this.mapRowToModel);
  }

  async getCustomerById(bakeryId: string, id: string): Promise<Customer> {
    const row = await this.repository.findById(bakeryId, id);
    return this.mapRowToModel(row);
  }

  async createCustomer(bakeryId: string, input: CreateCustomerInput): Promise<Customer> {
    const validated = createCustomerSchema.parse(input);

    const row = await this.repository.create(bakeryId, {
      name: validated.name,
      phone: validated.phone,
      email: validated.email || null,
      address: validated.address || null,
      google_maps_link: validated.googleMapsLink || null,
      notes: validated.notes || null,
    });

    return this.mapRowToModel(row);
  }

  async updateCustomer(
    bakeryId: string,
    id: string,
    input: UpdateCustomerInput,
  ): Promise<Customer> {
    const validated = updateCustomerSchema.parse(input);

    const payload: Partial<CustomerRow> = {};
    
    if (validated.name !== undefined) payload.name = validated.name;
    if (validated.phone !== undefined) payload.phone = validated.phone;
    if (validated.email !== undefined) payload.email = validated.email || null;
    if (validated.address !== undefined) payload.address = validated.address || null;
    if (validated.googleMapsLink !== undefined) payload.google_maps_link = validated.googleMapsLink || null;
    if (validated.notes !== undefined) payload.notes = validated.notes || null;

    const row = await this.repository.update(bakeryId, id, payload);
    return this.mapRowToModel(row);
  }

  private mapRowToModel(row: CustomerRow): Customer {
    return {
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email ?? undefined,
      address: row.address ?? undefined,
      googleMapsLink: row.google_maps_link ?? undefined,
      notes: row.notes ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
