import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CustomersClient } from '@/features/customers/api.client';
import { fetcher } from '@/shared/api/client';

vi.mock('@/shared/api/client', () => ({
  fetcher: vi.fn(),
}));

describe('CustomersClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createCustomer should call fetcher with POST', async () => {
    const payload = { name: 'John Doe', phone: '9876543210' } as any;
    vi.mocked(fetcher).mockResolvedValue({ id: 'new-c' });

    const result = await CustomersClient.createCustomer(payload);

    expect(fetcher).toHaveBeenCalledWith('/api/customers', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    expect(result).toEqual({ id: 'new-c' });
  });

  it('updateCustomer should call fetcher with PATCH', async () => {
    const payload = { name: 'Jane Doe' } as any;
    vi.mocked(fetcher).mockResolvedValue(undefined);

    await CustomersClient.updateCustomer('c-123', payload);

    expect(fetcher).toHaveBeenCalledWith('/api/customers/c-123', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  });
});
