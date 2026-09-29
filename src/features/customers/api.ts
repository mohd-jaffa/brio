import type { Tenant } from "@/lib/supabase/tenant";

import { EDITABLE_COLUMNS } from "@/constants/editableColumns";
import { REGULAR_MIN_ORDERS } from "@/constants/limits";
import { pageWindow, toPage, type Page } from "@/lib/api/pagination";
import { conflictError, isAppError } from "@/lib/errors";
import { fromPostgrestError } from "@/lib/errors/fromSupabaseError";
import { blankToNull, definedOnly } from "@/lib/supabase/columns";
import { readAll } from "@/lib/supabase/readAll";
import { tenantRecords } from "@/lib/supabase/records";
import { containsPattern, ilikeFilter, phoneDigits } from "@/lib/supabase/search";
import type { CreateCustomerPayload, CustomerListQuery, UpdateCustomerPayload } from "@/lib/validation";

import { customerSegment, newCustomersSince, summarise, type SummaryOrder } from "./summary";
import type { Customer, CustomerListItem, CustomerRow, CustomerSummary } from "./types";

/**
 * A bakery's customers. Tenant scoping, refusals and audit are the record
 * layer's (src/lib/supabase/records.ts); what is left here is this entity's
 * own shape — the columns it writes and how a row reads as a Customer.
 *
 * The input these take has already been parsed by its schema at the route
 * boundary, so the server is authoritative and nothing is parsed twice.
 */
const customers = (tenant: Tenant) => tenantRecords<CustomerRow>(tenant, "customers");

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

/** A customer's row with the counts `customer_stats` adds (0017_list_views.sql). */
type CustomerStatsRow = CustomerRow & { order_count: number; last_order_at: string | null; balance_due: number };

/**
 * A page of customers (plan §139.10, §133.9 I4), by name: all of them, the
 * Regulars (three or more orders), or the New (added in the last 30 days, not
 * yet Regular) — worked out in the database from `customer_stats`, so a
 * segment pages like any list. **DUE** is those who still owe the business
 * money, the most owed first (the user, 2026-09-27; 0024). A search matches
 * the name, or the phone on its digits however it was typed (BUG-23).
 */
export async function listCustomers(
  tenant: Tenant,
  query: CustomerListQuery,
  now: Date = new Date(),
): Promise<Page<CustomerListItem>> {
  const { from, to } = pageWindow(query.cursor);
  let request = tenant.supabase.from("customer_stats").select("*").eq("bakery_id", tenant.bakeryId);
  if (query.segment === "REGULAR") request = request.gte("order_count", REGULAR_MIN_ORDERS);
  if (query.segment === "NEW")
    request = request.lt("order_count", REGULAR_MIN_ORDERS).gte("created_at", newCustomersSince(now));
  if (query.segment === "DUE") request = request.gt("balance_due", 0).order("balance_due", { ascending: false });
  const pattern = query.search ? containsPattern(query.search) : null;
  if (query.search && pattern) {
    const digits = phoneDigits(query.search);
    request = request.or([ilikeFilter("name", pattern), ...(digits ? [`phone.like."%${digits}%"`] : [])].join(","));
  }

  const { data, error } = await request
    .order("name", { ascending: true })
    .order("id", { ascending: true })
    .range(from, to);
  if (error) throw fromPostgrestError(error);

  const page = toPage((data ?? []) as CustomerStatsRow[], query.cursor);
  return {
    ...page,
    items: page.items.map((row) => ({
      ...toCustomer(row),
      orders: row.order_count,
      lastOrderAt: row.last_order_at,
      balanceDue: Number(row.balance_due),
      segment: customerSegment(row.order_count, row.created_at, now),
    })),
  };
}

export async function getCustomerById(tenant: Tenant, id: string): Promise<Customer> {
  return toCustomer(await customers(tenant).find(id));
}

export async function createCustomer(tenant: Tenant, input: CreateCustomerPayload): Promise<Customer> {
  return toCustomer(await namingDuplicate(tenant, input.phone, null, customers(tenant).insert(toColumns(input))));
}

export async function updateCustomer(tenant: Tenant, id: string, input: UpdateCustomerPayload): Promise<Customer> {
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
async function namingDuplicate<T>(
  tenant: Tenant,
  phone: string | undefined,
  self: string | null,
  write: Promise<T>,
): Promise<T> {
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

/**
 * A customer's summary (plan §139.10, R5.4): their orders, with only the
 * columns the sums need and each order's payments embedded — a window at a
 * time, for a regular of many years — then summed on the server. Reading the customer first refuses one from another business
 * or that does not exist, as their detail does.
 */
export async function getCustomerSummary(tenant: Tenant, id: string, now: Date = new Date()): Promise<CustomerSummary> {
  const customer = await customers(tenant).find(id);
  const orders = await readAll<SummaryOrder>((from, to) =>
    tenant.supabase
      .from("orders")
      .select(
        "id, total, status, created_at, delivery_type, delivery_address, delivery_google_maps_link, payments(amount)",
      )
      .eq("bakery_id", tenant.bakeryId)
      .eq("customer_id", id)
      .order("id", { ascending: true })
      .range(from, to),
  );
  return summarise(orders, customer.created_at, now);
}
