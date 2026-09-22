import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthClient } from '@/features/auth/api.client';

const mockFetch = vi.fn();
global.fetch = mockFetch;

function mockFetchSuccess(data: unknown) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ data }),
  });
}

function mockFetchError(status: number, code: string, message: string) {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
    json: async () => ({ error: { code, message } }),
  });
}

describe('AuthClient', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('calls POST /api/auth/login on login', async () => {
    mockFetchSuccess({ accessToken: 'token-123' });
    const result = await AuthClient.login({ phone: '9876543210', password: 'Password123!' });
    expect(mockFetch).toHaveBeenCalledWith('/api/auth/login', expect.objectContaining({ method: 'POST' }));
    expect(result.accessToken).toBe('token-123');
  });

  it('calls POST /api/auth/register on register', async () => {
    mockFetchSuccess({ userId: 'usr-1', bakeryId: 'bak-1' });
    const result = await AuthClient.register({
      name: 'Jane Baker',
      businessName: 'Jane Bakery',
      phone: '9876543210',
      email: 'jane@bakery.com',
      password: 'Password123!',
      confirmPassword: 'Password123!',
    });
    expect(mockFetch).toHaveBeenCalledWith('/api/auth/register', expect.objectContaining({ method: 'POST' }));
    expect(result.userId).toBe('usr-1');
  });

  it('handles auth login failure', async () => {
    mockFetchError(401, 'AUTH_INVALID_CREDENTIALS', 'Invalid credentials');
    await expect(AuthClient.login({ phone: '9876543210', password: 'wrong' })).rejects.toThrow();
  });
});
