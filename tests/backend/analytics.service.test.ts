import { describe, it, expect, vi, beforeEach, type Mocked } from "vitest";
import { AnalyticsService } from "@/features/analytics/service";
import { AnalyticsRepository } from "@/features/analytics/repository";

vi.mock("@/features/analytics/repository");

describe("AnalyticsService", () => {
  let service: AnalyticsService;
  let mockRepository: Mocked<AnalyticsRepository>;

  const mockClient = {} as any;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AnalyticsService(mockClient);
    mockRepository = vi.mocked(AnalyticsRepository).prototype as Mocked<AnalyticsRepository>;
  });

  describe("getOverview", () => {
    it("should fetch and return analytics overview", async () => {
      const mockData = {
        totalRevenue: 1000,
        totalOrders: 10,
        totalExpenses: 200,
        pendingPayments: 300,
      };

      mockRepository.getOverview.mockResolvedValue(mockData);

      const result = await service.getOverview("bakery-1");

      expect(result).toEqual(mockData);
      expect(mockRepository.getOverview).toHaveBeenCalledWith("bakery-1");
    });
  });
});
