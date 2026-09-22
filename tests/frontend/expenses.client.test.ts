import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExpensesClient } from '@/features/expenses/api.client';
import { fetcher } from '@/shared/api/client';

vi.mock('@/shared/api/client', () => ({
  fetcher: vi.fn(),
}));

describe('ExpensesClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createExpense should call fetcher with POST', async () => {
    const payload = { amount: 100, category: 'SUPPLIES' } as any;
    vi.mocked(fetcher).mockResolvedValue({ id: 'new-exp' });

    const result = await ExpensesClient.createExpense(payload);

    expect(fetcher).toHaveBeenCalledWith('/api/expenses', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    expect(result).toEqual({ id: 'new-exp' });
  });

  it('updateExpense should call fetcher with PATCH', async () => {
    const payload = { amount: 200 } as any;
    vi.mocked(fetcher).mockResolvedValue(undefined);

    await ExpensesClient.updateExpense('e-123', payload);

    expect(fetcher).toHaveBeenCalledWith('/api/expenses/e-123', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  });
});
