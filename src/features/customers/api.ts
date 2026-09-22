import { type SupabaseClient } from "@supabase/supabase-js";
import { type Customer, type CustomerRow } from "./types";
import { createAuditLog } from "@/features/audit/api";
import {
  createCustomerSchema,
  updateCustomerSchema,
  type CreateCustomerInput,
  type UpdateCustomerInput,
} from "@/lib/validation";
import { fromPostgrestError } from "@/lib/errors/fromSupabaseError";
import { requireRow } from "@/lib/supabase/writes";
import { pickColumns } from "@/lib/supabase/columns";
import { EDITABLE_COLUMNS } from "@/constants/editableColumns";

function mapRowToModel(row: CustomerRow): Customer {
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

/**
 * Reads all customers for a tenant, sorted alphabetically by name.
 */
export async function getAllCustomers(client: SupabaseClient, bakeryId: string): Promise<Customer[]> {
  const { data, error } = await client
    .from("customers")
    .select("*")
    .eq("bakery_id", bakeryId)
    .order("name");

  if (error) throw fromPostgrestError(error);
  return (data as CustomerRow[]).map(mapRowToModel);
}

/**
 * Reads a single customer by id.
 */
export async function getCustomerById(client: SupabaseClient, bakeryId: string, id: string): Promise<Customer> {
  const { data, error } = await client
    .from("customers")
    .select("*")
    .eq("bakery_id", bakeryId)
    .eq("id", id)
    .maybeSingle();

  if (error) throw fromPostgrestError(error);
  const row = await requireRow<CustomerRow>(
    Promise.resolve({ data, error: null } as any),
    "RECORD_NOT_FOUND"
  );
  return mapRowToModel(row);
}

/**
 * Creates a new customer row and records an audit log.
 */
export async function createCustomer(
  client: SupabaseClient, 
  bakeryId: string, 
  input: CreateCustomerInput
): Promise<Customer> {
  const validated = createCustomerSchema.parse(input);

  const { data: row, error } = await client
    .from("customers")
    .insert({
      bakery_id: bakeryId,
      name: validated.name,
      phone: validated.phone,
      email: validated.email || null,
      address: validated.address || null,
      google_maps_link: validated.googleMapsLink || null,
      notes: validated.notes || null,
    })
    .select()
    .single();

  if (error) throw fromPostgrestError(error);

  await createAuditLog(client, {
    bakery_id: bakeryId,
    user_id: null,
    action: "CREATE",
    entity_type: "customers",
    entity_id: row.id,
    new_data: row as unknown as Record<string, any>,
  });

  return mapRowToModel(row as CustomerRow);
}

/**
 * Updates an existing customer row safely using pickColumns against EDITABLE_COLUMNS.
 */
export async function updateCustomer(
  client: SupabaseClient,
  bakeryId: string,
  id: string,
  input: UpdateCustomerInput,
): Promise<Customer> {
  const validated = updateCustomerSchema.parse(input);
  const previousRow = await getCustomerById(client, bakeryId, id);

  const rawPatch: Partial<Record<string, any>> = {};
  if (validated.name !== undefined) rawPatch.name = validated.name;
  if (validated.phone !== undefined) rawPatch.phone = validated.phone;
  if (validated.email !== undefined) rawPatch.email = validated.email || null;
  if (validated.address !== undefined) rawPatch.address = validated.address || null;
  if (validated.googleMapsLink !== undefined) rawPatch.google_maps_link = validated.googleMapsLink || null;
  if (validated.notes !== undefined) rawPatch.notes = validated.notes || null;

  const patch = pickColumns(rawPatch, EDITABLE_COLUMNS.customers);

  const row = await requireRow<CustomerRow>(
    client
      .from("customers")
      .update(patch)
      .eq("bakery_id", bakeryId)
      .eq("id", id)
      .select()
      .maybeSingle(),
    "RECORD_NOT_FOUND"
  );

  await createAuditLog(client, {
    bakery_id: bakeryId,
    user_id: null,
    action: "UPDATE",
    entity_type: "customers",
    entity_id: row.id,
    previous_data: previousRow as unknown as Record<string, any>,
    new_data: row as unknown as Record<string, any>,
  });

  return mapRowToModel(row);
}
