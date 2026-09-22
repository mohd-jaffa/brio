import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaymentsClient } from '@/features/payments/api.client';
import { fetcher } from '@/shared/api/client';

vi.mock('@/shared/api/client', () => ({
  fetcher: vi.fn(),
}));

describe('PaymentsClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createPayment should call fetcher with POST and payload', async () => {
    const payload = {
      amount: 500,
      payment_method: 'CASH',
      notes: 'Initial deposit',
    } as any;
    const mockPayment = {
      id: 'pay-1',
      order_id: 'order-123',
      amount: 500,
      payment_method: 'CASH',
      notes: 'Initial deposit',
      created_at: '2026-09-22T12:00:00Z',
    };
    vi.mocked(fetcher).mockResolvedValue(mockPayment);

    const result = await PaymentsClient.createPayment('order-123', payload);

    expect(fetcher).toHaveBeenCalledWith('/api/orders/order-123/payments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    expect(result).toEqual(mockPayment);
  });

  it('getPayments should call fetcher with GET', async () => {
    const mockPayments = [
      {
        id: 'pay-1',
        order_id: 'order-123',
        amount: 500,
        payment_method: 'CASH',
      },
    ];
    vi.mocked(fetcher).mockResolvedValue(mockPayments);

    const result = await PaymentsClient.getPayments('order-123');

    expect(fetcher).toHaveBeenCalledWith('/api/orders/order-123/payments');
    expect(result).toEqual(mockPayments);
  });
});
