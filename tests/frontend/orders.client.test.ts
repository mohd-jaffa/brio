import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrdersClient } from '@/features/orders/api.client';
import { fetcher } from '@/shared/api/client';

vi.mock('@/shared/api/client', () => ({
  fetcher: vi.fn(),
}));

describe('OrdersClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getOrder should call fetcher with correct url', async () => {
    const mockOrder = { id: 'order-123' };
    vi.mocked(fetcher).mockResolvedValue(mockOrder);

    const result = await OrdersClient.getOrder('order-123');

    expect(fetcher).toHaveBeenCalledWith('/api/orders/order-123');
    expect(result).toEqual(mockOrder);
  });

  it('createOrder should call fetcher with POST and payload', async () => {
    const payload = { customerId: 'c1', items: [{ productId: 'p1', quantity: 1 }] } as any;
    vi.mocked(fetcher).mockResolvedValue({ id: 'new-order' });

    const result = await OrdersClient.createOrder(payload);

    expect(fetcher).toHaveBeenCalledWith('/api/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    expect(result).toEqual({ id: 'new-order' });
  });

  it('updateStatus should call fetcher with PATCH and payload', async () => {
    const payload = { status: 'DELIVERED' as const };
    vi.mocked(fetcher).mockResolvedValue(undefined);

    await OrdersClient.updateStatus('order-123', payload);

    expect(fetcher).toHaveBeenCalledWith('/api/orders/order-123', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  });
});
