import { type SupabaseClient } from "@supabase/supabase-js";
import { type CreateAuditLogDTO, type AuditLog } from "./types";
import { internalError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export async function createAuditLog(
  client: SupabaseClient, 
  payload: CreateAuditLogDTO
): Promise<AuditLog> {
  const { data, error } = await client
    .from("audit_logs")
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw internalError("INTERNAL_ERROR", error);
  }

  return data;
}

export async function getAuditLogsByEntity(
  client: SupabaseClient, 
  bakeryId: string, 
  entityType: string, 
  entityId: string
): Promise<AuditLog[]> {
  const { data, error } = await client
    .from("audit_logs")
    .select("*")
    .eq("bakery_id", bakeryId)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false });

  if (error) {
    throw internalError("INTERNAL_ERROR", error);
  }

  return data;
}

export async function logActionSafe(
  client: SupabaseClient, 
  payload: CreateAuditLogDTO
): Promise<void> {
  try {
    await createAuditLog(client, payload);
  } catch (error) {
    // We log the error but don't fail the primary business mutation
    logger.error("Failed to write audit log", { 
      bakeryId: payload.bakery_id,
      action: payload.action,
      entityType: payload.entity_type,
      entityId: payload.entity_id,
      error: String(error)
    });
  }
}
