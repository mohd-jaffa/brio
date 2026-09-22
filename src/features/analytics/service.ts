import { SupabaseClient } from "@supabase/supabase-js";
import { AnalyticsRepository, type AnalyticsOverview } from "./repository";
import { AuditService } from "../audit/service";

export class AnalyticsService {
  private readonly repository: AnalyticsRepository;
  private readonly auditService: AuditService;

  constructor(client: SupabaseClient) {
    this.repository = new AnalyticsRepository(client);
    this.auditService = new AuditService(client);
  }

  async getOverview(bakeryId: string): Promise<AnalyticsOverview> {
    return this.repository.getOverview(bakeryId);
  }
}
