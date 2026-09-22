import { type SupabaseClient } from "@supabase/supabase-js";
import { type CreateAuditLogDTO, type AuditLog } from "./types";
import { InternalServerError } from "@/shared/errors/app-error";

export class AuditRepository {
  constructor(private readonly client: SupabaseClient) {}

  async create(payload: CreateAuditLogDTO): Promise<AuditLog> {
    const { data, error } = await this.client
      .from("audit_logs")
      .insert(payload)
      .select()
      .single();

    if (error) {
      throw new InternalServerError("INTERNAL_ERROR", error);
    }

    return data;
  }
  
  async findByEntity(bakeryId: string, entityType: string, entityId: string): Promise<AuditLog[]> {
    const { data, error } = await this.client
      .from("audit_logs")
      .select("*")
      .eq("bakery_id", bakeryId)
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new InternalServerError("INTERNAL_ERROR", error);
    }

    return data;
  }
}
