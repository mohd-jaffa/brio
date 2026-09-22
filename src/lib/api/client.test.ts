import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ERROR_MESSAGES } from '@/constants/messages';
import { ApiError, deleteJson, fetcher, getJson, patchJson, postJson } from './client';

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

describe('fetcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('successfully returns data on successful response', async () => {
    const expectedData = { id: 'test-1', name: 'Test Item' };
    mockFetchSuccess(expectedData);

    const result = await fetcher<typeof expectedData>('/api/test');

    expect(mockFetch).toHaveBeenCalledWith('/api/test', {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    expect(result).toEqual(expectedData);
  });

  it('includes custom headers and method in request', async () => {
    const expectedData = { success: true };
    mockFetchSuccess(expectedData);

    const result = await fetcher('/api/test', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer token123',
      },
      body: JSON.stringify({ key: 'value' }),
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token123',
      },
      body: JSON.stringify({ key: 'value' }),
    });
    expect(result).toEqual(expectedData);
  });

  it('throws ApiError with status, code, and message on error response', async () => {
    mockFetchError(400, 'INVALID_INPUT', 'Validation failed');

    await expect(fetcher('/api/test')).rejects.toThrow('Validation failed');

    mockFetchError(404, 'NOT_FOUND', 'Resource not found');
    try {
      await fetcher('/api/test');
      expect.unreachable('Should have thrown ApiError');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.name).toBe('ApiError');
      expect(apiErr.status).toBe(404);
      expect(apiErr.code).toBe('NOT_FOUND');
      expect(apiErr.message).toBe('Resource not found');
    }
  });

  it('falls back to default error code and message when not provided in error body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    });

    try {
      await fetcher('/api/test');
      expect.unreachable('Should have thrown ApiError');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(500);
      expect(apiErr.code).toBe('UNKNOWN_ERROR');
      expect(apiErr.message).toBe(ERROR_MESSAGES.INTERNAL_ERROR);
    }
  });

  it('handles response where json parsing fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 502,
      json: async () => {
        throw new Error('Bad JSON');
      },
    });

    try {
      await fetcher('/api/test');
      expect.unreachable('Should have thrown ApiError');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(502);
      expect(apiErr.code).toBe('UNKNOWN_ERROR');
      expect(apiErr.message).toBe(ERROR_MESSAGES.INTERNAL_ERROR);
    }
  });
});

describe('the JSON verbs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('postJson sends the payload as a JSON body', async () => {
    mockFetchSuccess({ id: 'c-1' });

    await expect(postJson('/api/customers', { name: 'Meena' })).resolves.toEqual({ id: 'c-1' });
    expect(mockFetch).toHaveBeenCalledWith('/api/customers', {
      method: 'POST',
      body: JSON.stringify({ name: 'Meena' }),
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('patchJson sends the payload as a JSON body', async () => {
    mockFetchSuccess({ id: 'c-1' });

    await patchJson('/api/customers/c-1', { name: 'Meena G' });
    expect(mockFetch).toHaveBeenCalledWith('/api/customers/c-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Meena G' }),
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('deleteJson sends no body', async () => {
    mockFetchSuccess({ deleted: true });

    await deleteJson('/api/expenses/e-1');
    expect(mockFetch).toHaveBeenCalledWith('/api/expenses/e-1', {
      method: 'DELETE',
      body: undefined,
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('getJson reads without a method', async () => {
    mockFetchSuccess([{ id: 'c-1' }]);

    await expect(getJson('/api/customers')).resolves.toEqual([{ id: 'c-1' }]);
  });

  it('keeps the request id a failure was reported under', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ error: { code: 'CONFLICT', message: 'Clash', requestId: 'req_9' } }),
    });

    await expect(getJson('/api/orders')).rejects.toMatchObject({ requestId: 'req_9', code: 'CONFLICT' });
  });
});
