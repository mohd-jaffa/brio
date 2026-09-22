import { type SupabaseClient } from "@supabase/supabase-js";
import { AuditRepository } from "./repository";
import { type CreateAuditLogDTO } from "./types";
import { logger } from "@/shared/logging/logger";

export class AuditService {
  private readonly repository: AuditRepository;

  constructor(client: SupabaseClient) {
    this.repository = new AuditRepository(client);
  }

  async logAction(payload: CreateAuditLogDTO): Promise<void> {
    try {
      await this.repository.create(payload);
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
}
