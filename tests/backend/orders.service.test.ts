import { describe, it, expect, vi } from "vitest";
import { OrdersService } from "../../src/modules/orders/orders.service";

describe("OrdersService", () => {
  it("calculates totals server-side based on product prices", async () => {
    // Mock the repository and other services
    const validCustomerId = "123e4567-e89b-12d3-a456-426614174000";
    const validProductId = "987e6543-e21b-12d3-a456-426614174000";

    const mockOrderRepo = {
      generateOrderNumber: vi.fn().mockResolvedValue("#1001-000"),
      createOrder: vi.fn().mockImplementation((id, data) => Promise.resolve({ id: "order-1", ...data })),
      createOrderItems: vi.fn().mockResolvedValue([{ id: "item-1", product_id: validProductId, quantity: 2 }]),
      createOrderAdjustments: vi.fn().mockResolvedValue([{ id: "adj-1", amount: 500 }]),
    };

    const mockProductService = {
      getProductById: vi.fn().mockResolvedValue({
        id: validProductId,
        name: "Test Cake",
        defaultPrice: 15000, // 150.00
        isActive: true,
      }),
    };

    const mockInventoryService = {
      logTransaction: vi.fn().mockResolvedValue({}),
    };

    const mockClient = {};
    const service = new OrdersService(mockClient as any);
    
    // Inject mocks
    (service as any).repository = mockOrderRepo;
    (service as any).productsService = mockProductService;
    (service as any).inventoryService = mockInventoryService;

    const order = await service.createOrder("bakery-1", {
      customerId: validCustomerId,
      delivery: { type: "PICKUP", date: "2026-01-01T00:00:00Z" },
      payment: { status: "UNPAID" },
      items: [
        { productId: validProductId, quantity: 2 }
      ],
      adjustments: [
        { type: "DISCOUNT", name: "Loyalty", amount: 2000 },
        { type: "CHARGE", name: "Box", amount: 500 }
      ]
    });

    // 15000 * 2 = 30000 subtotal
    // 30000 - 2000 (discount) + 500 (charge) = 28500 total
    expect(order.pricing.subtotal).toBe(30000);
    expect(order.pricing.discount).toBe(2000);
    expect(order.pricing.deliveryCharge).toBe(500);
    expect(order.pricing.total).toBe(28500);
    
    // Check inventory reservation was dispatched
    expect(mockInventoryService.logTransaction).toHaveBeenCalledWith("bakery-1", {
      productId: validProductId,
      type: "ORDER_RESERVATION",
      quantity: -2,
      referenceType: "ORDER",
      referenceId: "order-1",
    });
  });

  it("rolls back if any step fails", async () => {
    const mockOrderRepo = {
      generateOrderNumber: vi.fn().mockResolvedValue("#1002-000"),
      createOrder: vi.fn().mockResolvedValue({ id: "order-1" }),
      createOrderItems: vi.fn().mockRejectedValue(new Error("DB Constraint Error")), // Simulating failure
      deleteOrderHard: vi.fn().mockResolvedValue(undefined),
    };

    const validCustomerId = "123e4567-e89b-12d3-a456-426614174000";
    const validProductId = "987e6543-e21b-12d3-a456-426614174000";

    const mockProductService = {
      getProductById: vi.fn().mockResolvedValue({
        id: validProductId,
        name: "Test Cake",
        defaultPrice: 15000,
        isActive: true,
      }),
    };

    const service = new OrdersService({} as any);
    (service as any).repository = mockOrderRepo;
    (service as any).productsService = mockProductService;

    await expect(
      service.createOrder("bakery-1", {
        customerId: validCustomerId,
        delivery: { type: "PICKUP", date: "2026-01-01T00:00:00Z" },
        payment: { status: "UNPAID" },
        items: [{ productId: validProductId, quantity: 1 }],
      })
    ).rejects.toThrow("DB Constraint Error");

    // Assert compensation logic was triggered
    expect(mockOrderRepo.deleteOrderHard).toHaveBeenCalledWith("order-1");
  });
});
