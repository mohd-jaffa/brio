/** What is written to the audit trail for a business mutation (AGENTS.md §11). */
export type AuditAction = "CREATE" | "UPDATE" | "DELETE" | "STATUS_CHANGE";

export interface CreateAuditLogDTO {
  bakery_id: string;
  /** Who made the change, when the caller is known. */
  user_id: string | null;
  action: AuditAction;
  /** The table the row belongs to. */
  entity_type: string;
  entity_id: string;
  previous_data?: Record<string, unknown> | null;
  new_data?: Record<string, unknown> | null;
}

export interface AuditLog extends CreateAuditLogDTO {
  id: string;
  created_at: string;
}
