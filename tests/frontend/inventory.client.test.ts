import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InventoryClient } from '@/features/inventory/api.client';
import { fetcher } from '@/shared/api/client';

vi.mock('@/shared/api/client', () => ({
  fetcher: vi.fn(),
}));

describe('InventoryClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('adjustStock should call fetcher with POST', async () => {
    const payload = { productId: 'p1', quantity: 10, type: 'STOCK_IN' } as any;
    vi.mocked(fetcher).mockResolvedValue({ id: 'new-inv' });

    const result = await InventoryClient.adjustStock(payload);

    expect(fetcher).toHaveBeenCalledWith('/api/inventory', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    expect(result).toEqual({ id: 'new-inv' });
  });
});
