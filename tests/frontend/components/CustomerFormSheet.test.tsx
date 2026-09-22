// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { CustomerFormSheet } from '@/features/customers/components/CustomerFormSheet';
import { CustomersClient } from '@/features/customers/api.client';
import { type Customer } from '@/features/customers/types';

vi.mock('@/features/customers/api.client', () => ({
  CustomersClient: {
    createCustomer: vi.fn(),
    updateCustomer: vi.fn(),
  },
}));

vi.mock('@/constants/messages', () => ({
  getErrorMessage: (msg: string) => msg,
  ERROR_MESSAGES: { EXTERNAL_SERVICE_ERROR: 'Service error' },
  VALIDATION_MESSAGES: {
    required: (field: string) => `${field} needs a value.`,
    phone: 'Enter a valid mobile number.',
    invalid: 'That value is not valid.',
    email: (field: string) => `${field} must look like name@example.com.`,
    wholeNumber: (field: string) => `${field} must be a whole number.`,
    number: (field: string) => `${field} must be a valid number.`,
    notNegative: (field: string) => `${field} cannot be negative.`,
    amount: (field: string) => `${field} must be a valid amount.`,
    chooseAtLeastOne: (field: string) => `Choose at least one ${field}.`,
    moreThanZero: (field: string) => `${field} must be more than 0.`,
    tooLong: (field: string, max: number) => `${field} can be at most ${max} characters.`,
  },
}));

describe('CustomerFormSheet', () => {
  const mockCustomer: Customer = {
    id: 'cust-123',
    name: 'Meena Gupta',
    phone: '9876543210',
    email: 'meena@example.com',
    address: '123 Baker Street',
    googleMapsLink: 'https://maps.app.goo.gl/example',
    notes: 'Allergic to peanuts',
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
      <CustomerFormSheet isOpen={false} onClose={vi.fn()} onSuccess={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders dialog with "New Customer" title when isOpen=true, no initialData', () => {
    render(<CustomerFormSheet isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /new customer/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. Meena Gupta')).toHaveValue('');
    expect(screen.getByPlaceholderText('e.g. +91 9876543210')).toHaveValue('');
  });

  it('renders "Edit Customer" title when initialData provided', () => {
    render(
      <CustomerFormSheet
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        initialData={mockCustomer}
      />
    );

    expect(screen.getByRole('heading', { name: /edit customer/i })).toBeInTheDocument();
  });

  it('populates form fields from initialData', () => {
    render(
      <CustomerFormSheet
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        initialData={mockCustomer}
      />
    );

    expect(screen.getByPlaceholderText('e.g. Meena Gupta')).toHaveValue('Meena Gupta');
    expect(screen.getByPlaceholderText('e.g. +91 9876543210')).toHaveValue('9876543210');
    expect(screen.getByPlaceholderText('meena@example.com')).toHaveValue('meena@example.com');
    expect(screen.getByPlaceholderText('Delivery address...')).toHaveValue('123 Baker Street');
    expect(screen.getByPlaceholderText('https://maps.app.goo.gl/...')).toHaveValue('https://maps.app.goo.gl/example');
    expect(screen.getByPlaceholderText('Preferences, allergies...')).toHaveValue('Allergic to peanuts');
  });

  it('shows validation error for empty name field on submit', async () => {
    const user = userEvent.setup();
    render(<CustomerFormSheet isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);

    const phoneInput = screen.getByPlaceholderText('e.g. +91 9876543210');
    await user.type(phoneInput, '9876543210');

    const submitButton = screen.getByRole('button', { name: /save customer/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Name needs a value.')).toBeInTheDocument();
    });
  });

  it('shows validation error for empty phone field on submit', async () => {
    const user = userEvent.setup();
    render(<CustomerFormSheet isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);

    const nameInput = screen.getByPlaceholderText('e.g. Meena Gupta');
    await user.type(nameInput, 'Rajesh Kumar');

    const submitButton = screen.getByRole('button', { name: /save customer/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Enter a valid mobile number.')).toBeInTheDocument();
    });
  });

  it('calls CustomersClient.createCustomer on valid new customer submit', async () => {
    const user = userEvent.setup();
    vi.mocked(CustomersClient.createCustomer).mockResolvedValue({ id: 'new-cust-id' });

    render(<CustomerFormSheet isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);

    await user.type(screen.getByPlaceholderText('e.g. Meena Gupta'), 'Aarav Sharma');
    await user.type(screen.getByPlaceholderText('e.g. +91 9876543210'), '9876543210');
    await user.type(screen.getByPlaceholderText('meena@example.com'), 'aarav@example.com');
    await user.type(screen.getByPlaceholderText('Delivery address...'), '456 MG Road');
    await user.type(screen.getByPlaceholderText('https://maps.app.goo.gl/...'), 'https://maps.app.goo.gl/aarav');
    await user.type(screen.getByPlaceholderText('Preferences, allergies...'), 'Eggless only');

    const submitButton = screen.getByRole('button', { name: /save customer/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(CustomersClient.createCustomer).toHaveBeenCalledTimes(1);
      expect(CustomersClient.createCustomer).toHaveBeenCalledWith({
        name: 'Aarav Sharma',
        phone: '9876543210',
        email: 'aarav@example.com',
        address: '456 MG Road',
        googleMapsLink: 'https://maps.app.goo.gl/aarav',
        notes: 'Eggless only',
      });
    });
  });

  it('calls CustomersClient.updateCustomer on valid edit submit', async () => {
    const user = userEvent.setup();
    vi.mocked(CustomersClient.updateCustomer).mockResolvedValue(undefined);

    render(
      <CustomerFormSheet
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        initialData={mockCustomer}
      />
    );

    const nameInput = screen.getByPlaceholderText('e.g. Meena Gupta');
    await user.clear(nameInput);
    await user.type(nameInput, 'Meena Patel');

    const submitButton = screen.getByRole('button', { name: /save customer/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(CustomersClient.updateCustomer).toHaveBeenCalledTimes(1);
      expect(CustomersClient.updateCustomer).toHaveBeenCalledWith('cust-123', {
        name: 'Meena Patel',
        phone: '9876543210',
        email: 'meena@example.com',
        address: '123 Baker Street',
        googleMapsLink: 'https://maps.app.goo.gl/example',
        notes: 'Allergic to peanuts',
      });
    });
  });

  it('calls onSuccess and onClose after successful create', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    const handleSuccess = vi.fn();
    vi.mocked(CustomersClient.createCustomer).mockResolvedValue({ id: 'new-cust-id' });

    render(
      <CustomerFormSheet
        isOpen={true}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    );

    await user.type(screen.getByPlaceholderText('e.g. Meena Gupta'), 'Aarav Sharma');
    await user.type(screen.getByPlaceholderText('e.g. +91 9876543210'), '9876543210');

    const submitButton = screen.getByRole('button', { name: /save customer/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(handleSuccess).toHaveBeenCalledTimes(1);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  it('shows error message when API call fails', async () => {
    const user = userEvent.setup();
    vi.mocked(CustomersClient.createCustomer).mockRejectedValue(new Error('Failed to create customer record'));

    render(<CustomerFormSheet isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);

    await user.type(screen.getByPlaceholderText('e.g. Meena Gupta'), 'Aarav Sharma');
    await user.type(screen.getByPlaceholderText('e.g. +91 9876543210'), '9876543210');

    const submitButton = screen.getByRole('button', { name: /save customer/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to create customer record')).toBeInTheDocument();
    });
  });

  it('disables submit button while submitting', async () => {
    let resolvePromise: (value: any) => void;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    vi.mocked(CustomersClient.createCustomer).mockImplementation(() => pendingPromise as any);

    render(<CustomerFormSheet isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('e.g. Meena Gupta'), {
      target: { value: 'Aarav Sharma' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. +91 9876543210'), {
      target: { value: '9876543210' },
    });

    const submitButton = screen.getByRole('button', { name: /save customer/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });

    resolvePromise!({ id: 'done' });
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });

  it('calls onClose when backdrop clicked', () => {
    const handleClose = vi.fn();
    const { container } = render(
      <CustomerFormSheet isOpen={true} onClose={handleClose} onSuccess={vi.fn()} />
    );

    const backdrop = container.querySelector('div[aria-hidden="true"]');
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when X button clicked', () => {
    const handleClose = vi.fn();
    const { container } = render(
      <CustomerFormSheet isOpen={true} onClose={handleClose} onSuccess={vi.fn()} />
    );

    const closeButton = container.querySelector('button .lucide-x')?.closest('button');
    expect(closeButton).not.toBeNull();
    fireEvent.click(closeButton!);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
