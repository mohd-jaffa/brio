import type { Tenant } from "@/lib/supabase/tenant";

import { EDITABLE_COLUMNS } from "@/constants/editableColumns";
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
  return toCustomer(await customers(tenant).insert(toColumns(input)));
}

export async function updateCustomer(
  tenant: Tenant,
  id: string,
  input: UpdateCustomerPayload,
): Promise<Customer> {
  const row = await customers(tenant).update(id, toColumns(input), EDITABLE_COLUMNS.customers);
  return toCustomer(row);
}
