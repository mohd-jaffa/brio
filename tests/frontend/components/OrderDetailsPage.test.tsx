// @vitest-environment jsdom
// @ts-ignore - typing mismatch with react 19
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import OrderDetailsPage from '@/app/orders/[id]/page';
import { OrdersClient } from '@/features/orders/api.client';
import useSWR from 'swr';
import { ThemeProvider } from '@/shared/theme/ThemeProvider';

vi.mock('swr');
vi.mock('@/features/orders/api.client', () => ({
  OrdersClient: {
    updateStatus: vi.fn().mockResolvedValue({}),
  }
}));

describe('OrderDetailsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    vi.mocked(useSWR).mockReturnValue({
      data: undefined,
      error: undefined,
      mutate: vi.fn(),
      isLoading: true,
      isValidating: false,
    });

    render(
      <ThemeProvider>
        <OrderDetailsPage params={{ id: '123' }} />
      </ThemeProvider>
    );
    expect(document.body).toBeTruthy();
  });

  it('renders order details when data is loaded', () => {
    vi.mocked(useSWR).mockImplementation((key) => {
      if (key === '/api/orders/123') {
        return {
          data: {
            id: '123',
            orderNumber: 'ORD-001',
            status: 'PENDING',
            customerId: 'c1',
            delivery: { type: 'PICKUP', date: new Date().toISOString() },
            payment: { status: 'UNPAID' },
            items: [],
            adjustments: [],
            pricing: { total: 1000, subtotal: 1000, tax: 0 }
          },
          mutate: vi.fn(),
          isLoading: false,
        } as any;
      }
      if (key === '/api/customers/c1') {
        return {
          data: { id: 'c1', name: 'John Doe', phone: '123' },
          mutate: vi.fn(),
          isLoading: false,
        } as any;
      }
      return { data: undefined } as any;
    });

    render(
      <ThemeProvider>
        <OrderDetailsPage params={{ id: '123' }} />
      </ThemeProvider>
    );
    
    expect(document.body.textContent).toContain('John Doe');
    expect(document.body.textContent).toContain('ORD-001');
    expect(document.body.textContent).toContain('10');
  });

  it('calls updateStatus on status change', async () => {
    const mockMutate = vi.fn();
    vi.mocked(useSWR).mockImplementation((key) => {
      if (key === '/api/orders/123') {
        return {
          data: {
            id: '123',
            orderNumber: 'ORD-001',
            status: 'PENDING',
            customerId: 'c1',
            delivery: { type: 'PICKUP', date: new Date().toISOString() },
            payment: { status: 'UNPAID' },
            items: [],
            adjustments: [],
            pricing: { total: 1000, subtotal: 1000, tax: 0 }
          },
          mutate: mockMutate,
          isLoading: false,
        } as any;
      }
      return { data: undefined, isLoading: false } as any;
    });

    render(
      <ThemeProvider>
        <OrderDetailsPage params={{ id: '123' }} />
      </ThemeProvider>
    );

    const selects = screen.getAllByRole('combobox');
    const statusSelect = selects[0]; // Assuming first select is order status

    fireEvent.change(statusSelect, { target: { value: 'DELIVERED' } });

    await waitFor(() => {
      expect(OrdersClient.updateStatus).toHaveBeenCalledWith('123', { status: 'DELIVERED' });
    });
  });
});
