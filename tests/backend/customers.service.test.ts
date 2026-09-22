import { describe, it, expect, vi } from "vitest";
import { CustomersService } from "../../src/features/customers/service";

describe("CustomersService", () => {
  it("normalizes phone numbers before creating customer", async () => {
    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: "customer-1",
            name: "Test Customer",
            phone: "+919876543210", // normalized
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

    const service = new CustomersService(mockClient as any);
    
    await service.createCustomer("bakery-1", {
      name: "Test Customer",
      phone: "+91 98765-43210", // unnormalized
    });

    // Check that the insert was called with the normalized phone
    expect(mockInsert).toHaveBeenCalledWith({
      name: "Test Customer",
      phone: "+919876543210",
      email: null,
      address: null,
      google_maps_link: null,
      notes: null,
      bakery_id: "bakery-1",
    });
  });
});
