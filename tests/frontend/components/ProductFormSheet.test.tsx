// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ProductFormSheet } from '@/features/products/components/ProductFormSheet';
import { ProductsClient } from '@/features/products/api.client';
import { type Product } from '@/features/products/types';

vi.mock('@/features/products/api.client', () => ({
  ProductsClient: {
    createProduct: vi.fn(),
    updateProduct: vi.fn(),
  },
}));

vi.mock('@/constants/messages', () => ({
  getErrorMessage: (msg: string) => msg,
  ERROR_MESSAGES: { EXTERNAL_SERVICE_ERROR: 'Service error' },
}));

describe('ProductFormSheet', () => {
  const mockProduct: Product = {
    id: 'prod-123',
    name: 'Chocolate Truffle Cake',
    description: 'Rich dark chocolate cake',
    defaultPrice: 25000, // 250.00 rupees in paise
    unit: 'piece',
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders nothing when isOpen=false', () => {
    const { container } = render(
      <ProductFormSheet isOpen={false} onClose={vi.fn()} onSuccess={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders "New Product" title', () => {
    render(<ProductFormSheet isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /new product/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. Chocolate Truffle Cake')).toHaveValue('');
    expect(screen.getByPlaceholderText('0.00')).toHaveValue(0);
  });

  it('renders "Edit Product" when initialData provided', () => {
    render(
      <ProductFormSheet
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        initialData={mockProduct}
      />
    );

    expect(screen.getByRole('heading', { name: /edit product/i })).toBeInTheDocument();
  });

  it('initialData converts paise to rupees in price field', () => {
    render(
      <ProductFormSheet
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        initialData={mockProduct}
      />
    );

    // 25000 paise = 250 rupees
    expect(screen.getByPlaceholderText('0.00')).toHaveValue(250);
    expect(screen.getByPlaceholderText('e.g. Chocolate Truffle Cake')).toHaveValue('Chocolate Truffle Cake');
    expect(screen.getByPlaceholderText('Product details...')).toHaveValue('Rich dark chocolate cake');
    expect(screen.getByRole('combobox')).toHaveValue('piece');
    expect(screen.getByRole('checkbox', { name: /available for orders/i })).toBeChecked();
  });

  it('shows validation error for empty name field on submit', async () => {
    const user = userEvent.setup();
    render(<ProductFormSheet isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);

    const submitButton = screen.getByRole('button', { name: /save product/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument();
    });
  });

  it('calls createProduct with price in paise (rupees * 100)', async () => {
    const user = userEvent.setup();
    vi.mocked(ProductsClient.createProduct).mockResolvedValue({ id: 'new-prod-id' });

    render(<ProductFormSheet isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);

    await user.type(screen.getByPlaceholderText('e.g. Chocolate Truffle Cake'), 'Red Velvet Cake');
    const priceInput = screen.getByPlaceholderText('0.00');
    await user.clear(priceInput);
    await user.type(priceInput, '350.50');

    await user.selectOptions(screen.getByRole('combobox'), 'kg');
    await user.type(screen.getByPlaceholderText('Product details...'), 'Freshly baked daily');

    const submitButton = screen.getByRole('button', { name: /save product/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(ProductsClient.createProduct).toHaveBeenCalledTimes(1);
      expect(ProductsClient.createProduct).toHaveBeenCalledWith({
        name: 'Red Velvet Cake',
        defaultPrice: 35050,
        unit: 'kg',
        description: 'Freshly baked daily',
        isActive: true,
      });
    });
  });

  it('calls updateProduct for edit mode', async () => {
    const user = userEvent.setup();
    vi.mocked(ProductsClient.updateProduct).mockResolvedValue(undefined);

    render(
      <ProductFormSheet
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        initialData={mockProduct}
      />
    );

    const nameInput = screen.getByPlaceholderText('e.g. Chocolate Truffle Cake');
    await user.clear(nameInput);
    await user.type(nameInput, 'Premium Chocolate Truffle');

    const priceInput = screen.getByPlaceholderText('0.00');
    await user.clear(priceInput);
    await user.type(priceInput, '275');

    const submitButton = screen.getByRole('button', { name: /save product/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(ProductsClient.updateProduct).toHaveBeenCalledTimes(1);
      expect(ProductsClient.updateProduct).toHaveBeenCalledWith('prod-123', {
        name: 'Premium Chocolate Truffle',
        defaultPrice: 27500,
        unit: 'piece',
        description: 'Rich dark chocolate cake',
        isActive: true,
      });
    });
  });

  it('calls onSuccess and onClose after successful create', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    const handleSuccess = vi.fn();
    vi.mocked(ProductsClient.createProduct).mockResolvedValue({ id: 'new-prod-id' });

    render(
      <ProductFormSheet
        isOpen={true}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    );

    await user.type(screen.getByPlaceholderText('e.g. Chocolate Truffle Cake'), 'Vanilla Cupcake');
    const submitButton = screen.getByRole('button', { name: /save product/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(handleSuccess).toHaveBeenCalledTimes(1);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  it('shows error message on API failure', async () => {
    const user = userEvent.setup();
    vi.mocked(ProductsClient.createProduct).mockRejectedValue(new Error('Product creation failed on server'));

    render(<ProductFormSheet isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);

    await user.type(screen.getByPlaceholderText('e.g. Chocolate Truffle Cake'), 'Red Velvet Cake');
    const submitButton = screen.getByRole('button', { name: /save product/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Product creation failed on server')).toBeInTheDocument();
    });
  });

  it('disables submit button while submitting', async () => {
    let resolvePromise: (value: any) => void;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    vi.mocked(ProductsClient.createProduct).mockImplementation(() => pendingPromise as any);

    render(<ProductFormSheet isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('e.g. Chocolate Truffle Cake'), {
      target: { value: 'Mango Pastry' },
    });

    const submitButton = screen.getByRole('button', { name: /save product/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });

    resolvePromise!({ id: 'done' });
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });

  it('close/backdrop clicks work', () => {
    const handleClose = vi.fn();
    const { container } = render(
      <ProductFormSheet isOpen={true} onClose={handleClose} onSuccess={vi.fn()} />
    );

    const backdrop = container.querySelector('div[aria-hidden="true"]');
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);
    expect(handleClose).toHaveBeenCalledTimes(1);

    const closeButton = container.querySelector('button .lucide-x')?.closest('button');
    expect(closeButton).not.toBeNull();
    fireEvent.click(closeButton!);
    expect(handleClose).toHaveBeenCalledTimes(2);
  });
});
