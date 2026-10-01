import type { SupabaseClient } from "@supabase/supabase-js";

import type { UserRole } from "@/constants/roles";
import { pageWindow, toPage, type Page } from "@/lib/api/pagination";
import { fromPostgrestError } from "@/lib/errors/fromSupabaseError";
import { ilikeFilter, referencePattern } from "@/lib/supabase/search";
import type { AdminErrorQuery, AdminListQuery } from "@/lib/validation";

import type { AdminAccount, AdminAuditEntry, AdminErrorEntry, AdminOverview } from "./types";

/**
 * The developer console's reads (plan §5, §37; the user, 2026-09-27 and
 * 2026-09-30): the accounts, the audit trail and the error log, across every
 * business. They are fixed, read-only queries on the server's client, reached
 * only through `withDevRoute`, and they show what the app already keeps —
 * nothing here writes, and nothing new is recorded for them.
 */

const DAY_MS = 86_400_000;

/** How many rows a query matched, without reading them. */
async function count(query: PromiseLike<{ count: number | null; error: unknown }>): Promise<number> {
  const { count: matched, error } = await query;
  if (error) throw fromPostgrestError(error as Parameters<typeof fromPostgrestError>[0]);
  return matched ?? 0;
}

/** `GET /api/admin/overview`: how many accounts, businesses, audit lines and errors there are. */
export async function readOverview(admin: SupabaseClient, now: Date = new Date()): Promise<AdminOverview> {
  const head = { count: "exact", head: true } as const;
  const since = new Date(now.getTime() - DAY_MS).toISOString();
  const [total, owners, developers, businesses, audit, lastDay, errors, errorsLastDay] = await Promise.all([
    count(admin.from("profiles").select("id", head)),
    count(admin.from("profiles").select("id", head).eq("role", "USER")),
    count(admin.from("profiles").select("id", head).eq("role", "DEV")),
    count(admin.from("bakeries").select("id", head)),
    count(admin.from("audit_logs").select("id", head)),
    count(admin.from("audit_logs").select("id", head).gte("created_at", since)),
    count(admin.from("error_logs").select("id", head)),
    count(admin.from("error_logs").select("id", head).gte("created_at", since)),
  ]);
  return {
    users: { total, owners, developers },
    businesses,
    audit: { total: audit, lastDay },
    errors: { total: errors, lastDay: errorsLastDay },
  };
}

interface AccountRow {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: UserRole;
  avatar: string;
  is_active: boolean;
  must_change_password: boolean;
  email_confirmed_at: string | null;
  created_at: string;
  business: { business_name: string; city: string | null } | null;
}

/** `GET /api/admin/users`: every account, newest first, with the business an owner runs. */
export async function listAccounts(admin: SupabaseClient, query: AdminListQuery): Promise<Page<AdminAccount>> {
  const window = pageWindow(query.cursor);
  const { data, error } = await admin
    .from("profiles")
    .select(
      "id, name, phone, email, role, avatar, is_active, must_change_password, email_confirmed_at, created_at, business:bakeries(business_name, city)",
    )
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .range(window.from, window.to);
  if (error) throw fromPostgrestError(error);
  const page = toPage((data ?? []) as unknown as AccountRow[], query.cursor);
  return {
    ...page,
    items: page.items.map((row) => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      role: row.role,
      avatar: row.avatar,
      active: row.is_active,
      mustChangePassword: row.must_change_password,
      emailConfirmedAt: row.email_confirmed_at,
      createdAt: row.created_at,
      business: row.business ? { name: row.business.business_name, city: row.business.city } : null,
    })),
  };
}

interface AuditRow {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  previous_data: unknown;
  new_data: unknown;
  created_at: string;
  actor: { name: string } | null;
  business: { business_name: string } | null;
}

/** `GET /api/admin/audit`: the audit trail of every business, newest first (§11). */
export async function listAuditLog(admin: SupabaseClient, query: AdminListQuery): Promise<Page<AdminAuditEntry>> {
  const window = pageWindow(query.cursor);
  const { data, error } = await admin
    .from("audit_logs")
    .select(
      "id, action, entity_type, entity_id, previous_data, new_data, created_at, actor:profiles(name), business:bakeries(business_name)",
    )
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .range(window.from, window.to);
  if (error) throw fromPostgrestError(error);
  const page = toPage((data ?? []) as unknown as AuditRow[], query.cursor);
  return {
    ...page,
    items: page.items.map((row) => ({
      id: row.id,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      actor: row.actor?.name ?? null,
      business: row.business?.business_name ?? null,
      before: row.previous_data,
      after: row.new_data,
      createdAt: row.created_at,
    })),
  };
}

interface ErrorRow {
  id: string;
  source: AdminErrorEntry["source"];
  message: string;
  reference: string | null;
  code: string | null;
  kind: string | null;
  http_status: number | null;
  method: string | null;
  path: string | null;
  detail: string | null;
  stack: string | null;
  context: unknown;
  created_at: string;
  user: { name: string } | null;
  business: { business_name: string } | null;
}

/**
 * `GET /api/admin/logs`: what failed on the server, newest first (plan §103,
 * §37), with who was asking and for which business. A search finds the
 * reference a person quoted, or words of the message.
 */
export async function listErrorLog(admin: SupabaseClient, query: AdminErrorQuery): Promise<Page<AdminErrorEntry>> {
  const window = pageWindow(query.cursor);
  let request = admin
    .from("error_logs")
    .select(
      "id, source, message, reference, code, kind, http_status, method, path, detail, stack, context, created_at, user:profiles(name), business:bakeries(business_name)",
    );
  const pattern = query.search ? referencePattern(query.search) : null;
  if (pattern) request = request.or([ilikeFilter("reference", pattern), ilikeFilter("message", pattern)].join(","));

  const { data, error } = await request
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .range(window.from, window.to);
  if (error) throw fromPostgrestError(error);
  const page = toPage((data ?? []) as unknown as ErrorRow[], query.cursor);
  return {
    ...page,
    items: page.items.map((row) => ({
      id: row.id,
      source: row.source,
      message: row.message,
      reference: row.reference,
      code: row.code,
      kind: row.kind,
      httpStatus: row.http_status,
      method: row.method,
      path: row.path,
      user: row.user?.name ?? null,
      business: row.business?.business_name ?? null,
      detail: row.detail,
      stack: row.stack,
      context: row.context,
      createdAt: row.created_at,
    })),
  };
}
