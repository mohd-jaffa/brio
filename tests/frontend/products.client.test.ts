import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProductsClient } from '@/features/products/api.client';
import { fetcher } from '@/shared/api/client';

vi.mock('@/shared/api/client', () => ({
  fetcher: vi.fn(),
}));

describe('ProductsClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createProduct should call fetcher with POST', async () => {
    const payload = { name: 'Cake', defaultPrice: 1000, unit: 'kg', isActive: true } as any;
    vi.mocked(fetcher).mockResolvedValue({ id: 'new-p' });

    const result = await ProductsClient.createProduct(payload);

    expect(fetcher).toHaveBeenCalledWith('/api/products', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    expect(result).toEqual({ id: 'new-p' });
  });

  it('updateProduct should call fetcher with PATCH', async () => {
    const payload = { isActive: false } as any;
    vi.mocked(fetcher).mockResolvedValue(undefined);

    await ProductsClient.updateProduct('p-123', payload);

    expect(fetcher).toHaveBeenCalledWith('/api/products/p-123', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  });
});
