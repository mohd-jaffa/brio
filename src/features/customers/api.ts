import type { Tenant } from "@/lib/supabase/tenant";

import { EDITABLE_COLUMNS } from "@/constants/editableColumns";
import { conflictError, isAppError } from "@/lib/errors";
import { fromPostgrestError } from "@/lib/errors/fromSupabaseError";
import { blankToNull, definedOnly } from "@/lib/supabase/columns";
import { tenantRecords } from "@/lib/supabase/records";
import type { CreateCustomerPayload, UpdateCustomerPayload } from "@/lib/validation";

import type { Customer, CustomerRow } from "./types";

/**
 * A bakery's customers. Tenant scoping, refusals and audit are the record
 * layer's (src/lib/supabase/records.ts); what is left here is this entity's
 * own shape — the columns it writes and how a row reads as a Customer.
 *
 * The input these take has already been parsed by its schema at the route
 * boundary, so the server is authoritative and nothing is parsed twice.
 */
const customers = (tenant: Tenant) =>
  tenantRecords<CustomerRow>(tenant, "customers");

export function toCustomer(row: CustomerRow): Customer {
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

/** The columns a customer form writes, from what it was given. */
function toColumns(input: UpdateCustomerPayload) {
  return definedOnly({
    name: input.name,
    phone: input.phone,
    email: blankToNull(input.email),
    address: blankToNull(input.address),
    google_maps_link: blankToNull(input.googleMapsLink),
    notes: blankToNull(input.notes),
  });
}

export async function getAllCustomers(tenant: Tenant): Promise<Customer[]> {
  const rows = await customers(tenant).list([{ column: "name" }]);
  return rows.map(toCustomer);
}

export async function getCustomerById(
  tenant: Tenant,
  id: string,
): Promise<Customer> {
  return toCustomer(await customers(tenant).find(id));
}

export async function createCustomer(
  tenant: Tenant,
  input: CreateCustomerPayload,
): Promise<Customer> {
  return toCustomer(await namingDuplicate(tenant, input.phone, null, customers(tenant).insert(toColumns(input))));
}

export async function updateCustomer(
  tenant: Tenant,
  id: string,
  input: UpdateCustomerPayload,
): Promise<Customer> {
  const row = await namingDuplicate(
    tenant,
    input.phone,
    id,
    customers(tenant).update(id, toColumns(input), EDITABLE_COLUMNS.customers),
  );
  return toCustomer(row);
}

/**
 * A write refused because another of this business's customers has the phone
 * number is reported as that, naming them — so the order screen can offer
 * **Use that customer** (plan §139.6, §139.11.4). Any other refusal is passed
 * on as it was.
 */
async function namingDuplicate<T>(tenant: Tenant, phone: string | undefined, self: string | null, write: Promise<T>): Promise<T> {
  try {
    return await write;
  } catch (error) {
    const holder = phone && isAppError(error) && error.kind === "CONFLICT" ? await findByPhone(tenant, phone) : null;
    if (holder && holder.id !== self) {
      throw conflictError("CUSTOMER_PHONE_ALREADY_EXISTS", { customerId: holder.id, name: holder.name });
    }
    throw error;
  }
}

async function findByPhone(tenant: Tenant, phone: string): Promise<{ id: string; name: string } | null> {
  const { data, error } = await tenant.supabase
    .from("customers")
    .select("id, name")
    .eq("bakery_id", tenant.bakeryId)
    .eq("phone", phone)
    .maybeSingle();
  if (error) throw fromPostgrestError(error);
  return data;
}
