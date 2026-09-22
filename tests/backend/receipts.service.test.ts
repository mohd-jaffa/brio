import { describe, it, expect, vi, beforeEach, type Mocked } from "vitest";
import { ReceiptsService } from "@/features/receipts/service";
import { OrdersService } from "@/features/orders/service";
import { PaymentsRepository } from "@/features/payments/repository";

vi.mock("@/features/orders/service");
vi.mock("@/features/payments/repository");

describe("ReceiptsService", () => {
  let service: ReceiptsService;
  let mockOrdersService: Mocked<OrdersService>;
  let mockPaymentsRepo: Mocked<PaymentsRepository>;

  const mockClient = {} as any;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ReceiptsService(mockClient);
    mockOrdersService = vi.mocked(OrdersService).prototype as Mocked<OrdersService>;
    mockPaymentsRepo = vi.mocked(PaymentsRepository).prototype as Mocked<PaymentsRepository>;
  });

  describe("generateReceiptData", () => {
    it("should fetch order, items, and payments and return ReceiptData", async () => {
      const mockOrder = { id: "order-1", total_amount: 1000, items: [{ id: "item-1", quantity: 2 }] } as any;
      const mockPayments = [{ id: "pay-1", amount: 500 }] as any;

      mockOrdersService.getOrderById.mockResolvedValue(mockOrder);
      mockPaymentsRepo.findByOrderId.mockResolvedValue(mockPayments);

      const result = await service.generateReceiptData("bakery-1", "order-1");

      expect(mockOrdersService.getOrderById).toHaveBeenCalledWith("bakery-1", "order-1");
      expect(mockPaymentsRepo.findByOrderId).toHaveBeenCalledWith("bakery-1", "order-1");

      expect(result.order).toEqual(mockOrder);
      expect(result.items).toEqual(mockOrder.items);
      expect(result.payments).toEqual(mockPayments);
      expect(result.bakeryName).toBe("Ovenly Bakery");
      expect(result.generatedAt).toBeDefined();
    });
  });
});
