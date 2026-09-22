import { describe, it, expect, vi } from "vitest";
import { InventoryService } from "../../src/features/inventory/service";

describe("InventoryService", () => {
  it("rejects invalid transaction signs", async () => {
    const mockClient = {
      from: vi.fn().mockReturnValue({ insert: vi.fn() }),
    };

    const service = new InventoryService(mockClient as any);
    
    // STOCK_IN must be positive
    await expect(
      service.logTransaction("bakery-1", {
        productId: "00000000-0000-0000-0000-000000000000",
        type: "STOCK_IN",
        quantity: -10,
      })
    ).rejects.toThrow();
    
    // WASTAGE must be negative
    await expect(
      service.logTransaction("bakery-1", {
        productId: "00000000-0000-0000-0000-000000000000",
        type: "WASTAGE",
        quantity: 5,
      })
    ).rejects.toThrow();
    
    // ADJUSTMENT cannot be 0
    await expect(
      service.logTransaction("bakery-1", {
        productId: "00000000-0000-0000-0000-000000000000",
        type: "ADJUSTMENT",
        quantity: 0,
      })
    ).rejects.toThrow();
  });

  it("calculates inventory balances correctly", async () => {
    const mockClient = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [
              { product_id: "prod-1", quantity: 50 }, // STOCK_IN
              { product_id: "prod-1", quantity: -5 }, // ORDER_CONSUMPTION
              { product_id: "prod-2", quantity: 10 }, // STOCK_IN
            ],
            error: null,
          }),
        }),
      }),
    };

    const service = new InventoryService(mockClient as any);
    const balances = await service.getBalances("bakery-1");

    expect(balances).toEqual([
      { productId: "prod-1", balance: 45 },
      { productId: "prod-2", balance: 10 },
    ]);
  });
});
