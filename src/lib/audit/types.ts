/** What is written to the audit trail for a business mutation (AGENTS.md §11). */
export type AuditAction = "CREATE" | "UPDATE" | "DELETE" | "STATUS_CHANGE";

/**
 * One change, as the feature that made it describes it. The business and the
 * acting user are not part of it: the audit logger takes both from the tenant.
 */
export interface AuditEntry {
  action: AuditAction;
  /** The table the row belongs to. */
  entity_type: string;
  entity_id: string;
  previous_data?: Record<string, unknown> | null;
  new_data?: Record<string, unknown> | null;
}
