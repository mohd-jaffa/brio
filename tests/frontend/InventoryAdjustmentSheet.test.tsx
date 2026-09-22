// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InventoryAdjustmentSheet } from '@/features/inventory/components/InventoryAdjustmentSheet';
import { InventoryClient } from '@/features/inventory/api.client';
import { type Product } from '@/features/products/types';

vi.mock('@/features/inventory/api.client', () => ({
  InventoryClient: {
    adjustStock: vi.fn(),
  },
}));

vi.mock('@/constants/messages', () => ({
  getErrorMessage: (msg: string) => msg,
  ERROR_MESSAGES: { EXTERNAL_SERVICE_ERROR: 'Service error' },
}));

describe('InventoryAdjustmentSheet', () => {
  const mockProduct: Product = {
    id: 'prod-1',
    name: 'Chocolate Cake',
    description: 'A delicious cake',
    defaultPrice: 50000,
    unit: 'piece',
    isActive: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders nothing when isOpen=false', () => {
    const { container } = render(
      <InventoryAdjustmentSheet
        isOpen={false}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        product={mockProduct}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when product is undefined', () => {
    const { container } = render(
      <InventoryAdjustmentSheet
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        product={undefined}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders "Adjust Stock" heading when isOpen and product provided', () => {
    render(
      <InventoryAdjustmentSheet
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        product={mockProduct}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /adjust stock/i })).toBeInTheDocument();
  });

  it('shows product name and unit in label', () => {
    render(
      <InventoryAdjustmentSheet
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        product={mockProduct}
      />
    );

    expect(screen.getByText('Chocolate Cake')).toBeInTheDocument();
    expect(screen.getByText(/quantity \(in pieces\)/i)).toBeInTheDocument();
  });

  it('default type is STOCK_IN', () => {
    const { container } = render(
      <InventoryAdjustmentSheet
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        product={mockProduct}
      />
    );

    const typeSelect = container.querySelector('select[name="type"]') as HTMLSelectElement;
    expect(typeSelect).toBeInTheDocument();
    expect(typeSelect.value).toBe('STOCK_IN');
  });

  it('calls adjustStock on submit', async () => {
    const handleSuccess = vi.fn();
    const handleClose = vi.fn();
    vi.mocked(InventoryClient.adjustStock).mockResolvedValue({} as any);

    render(
      <InventoryAdjustmentSheet
        isOpen={true}
        onClose={handleClose}
        onSuccess={handleSuccess}
        product={mockProduct}
      />
    );

    const quantityInput = screen.getByPlaceholderText('0');
    fireEvent.change(quantityInput, { target: { value: '12' } });

    const submitButton = screen.getByRole('button', { name: /confirm adjustment/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(InventoryClient.adjustStock).toHaveBeenCalledTimes(1);
      expect(InventoryClient.adjustStock).toHaveBeenCalledWith({
        productId: 'prod-1',
        type: 'STOCK_IN',
        quantity: 12,
        referenceType: 'MANUAL',
        referenceId: undefined,
      });
      expect(handleSuccess).toHaveBeenCalledTimes(1);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  it('WASTAGE type auto-negates positive quantity', async () => {
    const handleSuccess = vi.fn();
    const handleClose = vi.fn();
    vi.mocked(InventoryClient.adjustStock).mockResolvedValue({} as any);

    const { container } = render(
      <InventoryAdjustmentSheet
        isOpen={true}
        onClose={handleClose}
        onSuccess={handleSuccess}
        product={mockProduct}
      />
    );

    const typeSelect = container.querySelector('select[name="type"]') as HTMLSelectElement;
    fireEvent.change(typeSelect, { target: { value: 'WASTAGE' } });

    const quantityInput = screen.getByPlaceholderText('0');
    fireEvent.change(quantityInput, { target: { value: '5' } });

    const submitButton = screen.getByRole('button', { name: /confirm adjustment/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(InventoryClient.adjustStock).toHaveBeenCalledWith({
        productId: 'prod-1',
        type: 'WASTAGE',
        quantity: -5,
        referenceType: 'MANUAL',
        referenceId: undefined,
      });
      expect(handleSuccess).toHaveBeenCalledTimes(1);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  it('STOCK_IN auto-makes quantity positive', async () => {
    const handleSuccess = vi.fn();
    const handleClose = vi.fn();
    vi.mocked(InventoryClient.adjustStock).mockResolvedValue({} as any);

    render(
      <InventoryAdjustmentSheet
        isOpen={true}
        onClose={handleClose}
        onSuccess={handleSuccess}
        product={mockProduct}
      />
    );

    const quantityInput = screen.getByPlaceholderText('0');
    fireEvent.change(quantityInput, { target: { value: '-20' } });

    const submitButton = screen.getByRole('button', { name: /confirm adjustment/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(InventoryClient.adjustStock).toHaveBeenCalledWith({
        productId: 'prod-1',
        type: 'STOCK_IN',
        quantity: 20,
        referenceType: 'MANUAL',
        referenceId: undefined,
      });
    });
  });

  it('RETURN auto-makes quantity positive', async () => {
    const handleSuccess = vi.fn();
    const handleClose = vi.fn();
    vi.mocked(InventoryClient.adjustStock).mockResolvedValue({} as any);

    const { container } = render(
      <InventoryAdjustmentSheet
        isOpen={true}
        onClose={handleClose}
        onSuccess={handleSuccess}
        product={mockProduct}
      />
    );

    const typeSelect = container.querySelector('select[name="type"]') as HTMLSelectElement;
    fireEvent.change(typeSelect, { target: { value: 'RETURN' } });

    const quantityInput = screen.getByPlaceholderText('0');
    fireEvent.change(quantityInput, { target: { value: '-8' } });

    const submitButton = screen.getByRole('button', { name: /confirm adjustment/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(InventoryClient.adjustStock).toHaveBeenCalledWith({
        productId: 'prod-1',
        type: 'RETURN',
        quantity: 8,
        referenceType: 'MANUAL',
        referenceId: undefined,
      });
    });
  });

  it('shows error on API failure', async () => {
    vi.mocked(InventoryClient.adjustStock).mockRejectedValue(new Error('Adjustment conflict'));

    render(
      <InventoryAdjustmentSheet
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        product={mockProduct}
      />
    );

    const quantityInput = screen.getByPlaceholderText('0');
    fireEvent.change(quantityInput, { target: { value: '3' } });

    const submitButton = screen.getByRole('button', { name: /confirm adjustment/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Adjustment conflict')).toBeInTheDocument();
    });
  });

  it('calls onClose when backdrop clicked', () => {
    const handleClose = vi.fn();
    const { container } = render(
      <InventoryAdjustmentSheet
        isOpen={true}
        onClose={handleClose}
        onSuccess={vi.fn()}
        product={mockProduct}
      />
    );

    const backdrop = container.querySelector('div[aria-hidden="true"]');
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when X button clicked', () => {
    const handleClose = vi.fn();
    const { container } = render(
      <InventoryAdjustmentSheet
        isOpen={true}
        onClose={handleClose}
        onSuccess={vi.fn()}
        product={mockProduct}
      />
    );

    const closeButton = container.querySelector('button svg.lucide-x')?.closest('button');
    expect(closeButton).not.toBeNull();
    fireEvent.click(closeButton!);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('disables submit button and shows loading spinner while submitting', async () => {
    let resolvePromise: (val: any) => void;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    vi.mocked(InventoryClient.adjustStock).mockImplementation(() => pendingPromise as any);

    render(
      <InventoryAdjustmentSheet
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        product={mockProduct}
      />
    );

    const quantityInput = screen.getByPlaceholderText('0');
    fireEvent.change(quantityInput, { target: { value: '5' } });

    const submitButton = screen.getByRole('button', { name: /confirm adjustment/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });

    resolvePromise!({});
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });
});
