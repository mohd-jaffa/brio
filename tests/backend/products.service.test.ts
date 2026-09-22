import { describe, it, expect, vi } from "vitest";
import { ProductsService } from "../../src/features/products/service";

describe("ProductsService", () => {
  it("validates that defaultPrice is a non-negative integer", async () => {
    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: "product-1",
            name: "Test Cake",
            default_price: 50000,
            unit: "piece",
            is_active: true,
            created_at: "2026-01-01T00:00:00Z",
            updated_at: "2026-01-01T00:00:00Z",
          },
          error: null,
        }),
      }),
    });

    const mockClient = {
      from: vi.fn().mockReturnValue({
        insert: mockInsert,
      }),
    };

    const service = new ProductsService(mockClient as any);
    
    await expect(
      service.createProduct("bakery-1", {
        name: "Invalid Cake",
        defaultPrice: 100.50, // Float not allowed
      })
    ).rejects.toThrow();
    
    await expect(
      service.createProduct("bakery-1", {
        name: "Invalid Cake",
        defaultPrice: -500, // Negative not allowed
      })
    ).rejects.toThrow();

    await service.createProduct("bakery-1", {
      name: "Test Cake",
      defaultPrice: 50000, // Valid integer paise
    });

    // Check that the insert was called with the correct integer price
    expect(mockInsert).toHaveBeenCalledWith({
      name: "Test Cake",
      default_price: 50000,
      description: null,
      category_id: null,
      unit: "piece",
      is_active: true,
      bakery_id: "bakery-1",
    });
  });
});
