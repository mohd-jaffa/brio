import { type SupabaseClient } from "@supabase/supabase-js";
import { type Customer, type CustomerRow } from "./types";
import { createAuditLog } from "@/features/audit/api";
import {
  createCustomerSchema,
  updateCustomerSchema,
  type CreateCustomerInput,
  type UpdateCustomerInput,
} from "@/lib/validation";
import { ConflictError, ExternalServiceError, NotFoundError } from "@/shared/errors/app-error";

// ------------------------------------------------------------------
// Error & Data Mapping
// ------------------------------------------------------------------
function mapDatabaseError(error: unknown) {
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message: unknown }).message).toLowerCase()
      : "";

  if (message.includes("unique") && message.includes("phone")) {
    return new ConflictError(
      "CONFLICT",
      "A customer with this phone number already exists for this bakery."
    );
  }

  return new ExternalServiceError("EXTERNAL_SERVICE_ERROR", undefined, error);
}

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

async function getCustomerRowById(client: SupabaseClient, bakeryId: string, id: string): Promise<CustomerRow> {
  const { data, error } = await client
    .from("customers")
    .select("*")
    .eq("bakery_id", bakeryId)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw mapDatabaseError(error);
  }

  if (!data) {
    throw new NotFoundError("NOT_FOUND", "Customer not found");
  }

  return data as CustomerRow;
}

// ------------------------------------------------------------------
// API Functions
// ------------------------------------------------------------------

export async function getAllCustomers(client: SupabaseClient, bakeryId: string): Promise<Customer[]> {
  const { data, error } = await client
    .from("customers")
    .select("*")
    .eq("bakery_id", bakeryId)
    .order("name");

  if (error) {
    throw mapDatabaseError(error);
  }

  return (data as CustomerRow[]).map(mapRowToModel);
}

export async function getCustomerById(client: SupabaseClient, bakeryId: string, id: string): Promise<Customer> {
  const row = await getCustomerRowById(client, bakeryId, id);
  return mapRowToModel(row);
}

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

  if (error) {
    throw mapDatabaseError(error);
  }

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

export async function updateCustomer(
  client: SupabaseClient,
  bakeryId: string,
  id: string,
  input: UpdateCustomerInput,
): Promise<Customer> {
  const validated = updateCustomerSchema.parse(input);

  // We need the previous row for the audit log
  const previousRow = await getCustomerRowById(client, bakeryId, id);

  const payload: Partial<CustomerRow> = {};
  
  if (validated.name !== undefined) payload.name = validated.name;
  if (validated.phone !== undefined) payload.phone = validated.phone;
  if (validated.email !== undefined) payload.email = validated.email || null;
  if (validated.address !== undefined) payload.address = validated.address || null;
  if (validated.googleMapsLink !== undefined) payload.google_maps_link = validated.googleMapsLink || null;
  if (validated.notes !== undefined) payload.notes = validated.notes || null;

  const { data: row, error } = await client
    .from("customers")
    .update(payload)
    .eq("bakery_id", bakeryId)
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) {
    throw mapDatabaseError(error);
  }

  if (!row) {
    throw new NotFoundError("NOT_FOUND", "Customer not found");
  }

  await createAuditLog(client, {
    bakery_id: bakeryId,
    user_id: null,
    action: "UPDATE",
    entity_type: "customers",
    entity_id: row.id,
    previous_data: previousRow as unknown as Record<string, any>,
    new_data: row as unknown as Record<string, any>,
  });

  return mapRowToModel(row as CustomerRow);
}
