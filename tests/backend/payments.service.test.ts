import { describe, it, expect, vi, beforeEach, type Mocked } from "vitest";
import { PaymentsService } from "@/features/payments/service";
import { OrdersRepository } from "@/features/orders/repository";
import { PaymentsRepository } from "@/features/payments/repository";
import { AuditRepository } from "@/features/audit/repository";
import { JobsRepository } from "@/features/workers/repository";
import { ConflictError, NotFoundError } from "@/shared/errors/app-error";

vi.mock("@/features/orders/repository");
vi.mock("@/features/payments/repository");
vi.mock("@/features/audit/repository");
vi.mock("@/features/workers/repository");

describe("PaymentsService", () => {
  let service: PaymentsService;
  let mockOrdersRepo: Mocked<OrdersRepository>;
  let mockPaymentsRepo: Mocked<PaymentsRepository>;
  let mockAuditRepo: Mocked<AuditRepository>;
  let mockJobsRepo: Mocked<JobsRepository>;

  const mockClient = {} as any;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PaymentsService(mockClient);
    mockOrdersRepo = vi.mocked(OrdersRepository).prototype as Mocked<OrdersRepository>;
    mockPaymentsRepo = vi.mocked(PaymentsRepository).prototype as Mocked<PaymentsRepository>;
    mockAuditRepo = vi.mocked(AuditRepository).prototype as Mocked<AuditRepository>;
    mockJobsRepo = vi.mocked(JobsRepository).prototype as Mocked<JobsRepository>;
  });

  describe("createPayment", () => {
    it("should throw NotFoundError if order does not exist", async () => {
      mockOrdersRepo.findById.mockResolvedValue(null as any);

      await expect(
        service.createPayment("bakery-1", {
          order_id: "11111111-1111-4111-a111-111111111111",
          amount: "500",
          payment_method: "UPI",
        })
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw ConflictError if payment exceeds order total", async () => {
      mockOrdersRepo.findById.mockResolvedValue({
        order: { id: "11111111-1111-4111-a111-111111111111", total: 100000 } as any,
        items: [],
        adjustments: []
      });
      mockPaymentsRepo.findByOrderId.mockResolvedValue([{ amount: 60000 } as any]);

      await expect(
        service.createPayment("bakery-1", {
          order_id: "11111111-1111-4111-a111-111111111111",
          amount: "500", // Total would be 110000 (exceeds 100000)
          payment_method: "UPI",
        })
      ).rejects.toThrow(ConflictError);
    });

    it("should create payment and update order to PARTIALLY_PAID", async () => {
      mockOrdersRepo.findById.mockResolvedValue({
        order: { id: "11111111-1111-4111-a111-111111111111", total: 100000 } as any,
        items: [],
        adjustments: []
      });
      mockPaymentsRepo.findByOrderId.mockResolvedValue([{ amount: 20000 } as any]);
      
      const mockCreatedPayment = { id: "pay-1", amount: 50000 } as any;
      mockPaymentsRepo.create.mockResolvedValue(mockCreatedPayment);

      const result = await service.createPayment("bakery-1", {
        order_id: "11111111-1111-4111-a111-111111111111",
        amount: "500", // Total = 70000
        payment_method: "UPI",
      });

      expect(result).toEqual(mockCreatedPayment);
      expect(mockOrdersRepo.updateOrderStatus).toHaveBeenCalledWith("bakery-1", "11111111-1111-4111-a111-111111111111", { payment_status: "PARTIALLY_PAID" });
    });

    it("should create payment and update order to PAID", async () => {
      mockOrdersRepo.findById.mockResolvedValue({
        order: { id: "11111111-1111-4111-a111-111111111111", total: 100000 } as any,
        items: [],
        adjustments: []
      });
      mockPaymentsRepo.findByOrderId.mockResolvedValue([{ amount: 50000 } as any]);
      
      const mockCreatedPayment = { id: "pay-1", amount: 50000 } as any;
      mockPaymentsRepo.create.mockResolvedValue(mockCreatedPayment);

      const result = await service.createPayment("bakery-1", {
        order_id: "11111111-1111-4111-a111-111111111111",
        amount: "500", // Total = 100000
        payment_method: "UPI",
      });

      expect(result).toEqual(mockCreatedPayment);
      expect(mockOrdersRepo.updateOrderStatus).toHaveBeenCalledWith("bakery-1", "11111111-1111-4111-a111-111111111111", { payment_status: "PAID" });
    });
  });
});
