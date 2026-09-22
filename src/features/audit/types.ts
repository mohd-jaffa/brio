export type AuditAction = "CREATE" | "UPDATE" | "DELETE" | "STATUS_CHANGE";

export interface CreateAuditLogDTO {
  bakery_id: string;
  user_id: string | null;
  action: AuditAction;
  entity_type: string;
  entity_id: string;
  previous_data?: Record<string, any> | null;
  new_data?: Record<string, any> | null;
}

export interface AuditLog extends CreateAuditLogDTO {
  id: string;
  created_at: string;
}
