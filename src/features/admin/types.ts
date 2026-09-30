import type { UserRole } from "@/constants/roles";
import type { ErrorSource } from "@/constants/statuses";

/** The platform at a glance (`GET /api/admin/overview`). */
export interface AdminOverview {
  users: { total: number; owners: number; developers: number };
  businesses: number;
  audit: { total: number; lastDay: number };
  errors: { total: number; lastDay: number };
}

/** One account, as the console lists it (`GET /api/admin/users`). */
export interface AdminAccount {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: UserRole;
  avatar: string;
  active: boolean;
  mustChangePassword: boolean;
  emailConfirmedAt: string | null;
  createdAt: string;
  /** The business an owner runs; none for a developer. */
  business: { name: string; city: string | null } | null;
}

/** One line of the audit trail (`GET /api/admin/audit`), who and what, before and after. */
export interface AdminAuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  actor: string | null;
  business: string | null;
  before: unknown;
  after: unknown;
  createdAt: string;
}

/** One failure on the server (`GET /api/admin/logs`): where, what, who was asking, and what was thrown. */
export interface AdminErrorEntry {
  id: string;
  source: ErrorSource;
  message: string;
  /** What the person was shown to quote: a request's id, or a screen's digest. */
  reference: string | null;
  code: string | null;
  kind: string | null;
  httpStatus: number | null;
  method: string | null;
  path: string | null;
  user: string | null;
  business: string | null;
  detail: string | null;
  stack: string | null;
  context: unknown;
  createdAt: string;
}
