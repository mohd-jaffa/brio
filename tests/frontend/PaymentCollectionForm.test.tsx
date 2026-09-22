// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PaymentCollectionForm } from '@/features/payments/components/PaymentCollectionForm';
import { PaymentsClient } from '@/features/payments/api.client';

vi.mock('@/features/payments/api.client', () => ({
  PaymentsClient: {
    createPayment: vi.fn(),
  },
}));

vi.mock('@/constants/messages', async () => {
  const actual = await vi.importActual<typeof import('@/constants/messages')>('@/constants/messages');
  return {
    ...actual,
    ERROR_MESSAGES: {
      ...actual.ERROR_MESSAGES,
      EXTERNAL_SERVICE_ERROR: 'Service error',
    },
  };
});

describe('PaymentCollectionForm', () => {
  const mockOrderId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  const mockOrderTotal = 150000; // 1500 rupees in paise
  const mockTotalPaid = 50000;   // 500 rupees in paise
  // remaining = 100000 paise = 1000 rupees

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders "Collect Payment" heading', () => {
    render(
      <PaymentCollectionForm
        orderId={mockOrderId}
        orderTotal={mockOrderTotal}
        totalPaid={mockTotalPaid}
        onPaymentSuccess={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByRole('heading', { name: /collect payment/i })).toBeInTheDocument();
  });

  it('shows remaining amount correctly formatted', () => {
    render(
      <PaymentCollectionForm
        orderId={mockOrderId}
        orderTotal={mockOrderTotal}
        totalPaid={mockTotalPaid}
        onPaymentSuccess={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    // 100000 paise / 100 = 1000 rupees
    expect(screen.getByText(/remaining amount: ₹1,000/i)).toBeInTheDocument();
  });

  it('has amount input pre-filled with remaining amount in rupees', () => {
    render(
      <PaymentCollectionForm
        orderId={mockOrderId}
        orderTotal={mockOrderTotal}
        totalPaid={mockTotalPaid}
        onPaymentSuccess={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const amountInput = screen.getByPlaceholderText('e.g. 500');
    expect(amountInput).toHaveValue('1000');
  });

  it('Cancel button calls onCancel', () => {
    const handleCancel = vi.fn();

    render(
      <PaymentCollectionForm
        orderId={mockOrderId}
        orderTotal={mockOrderTotal}
        totalPaid={mockTotalPaid}
        onPaymentSuccess={vi.fn()}
        onCancel={handleCancel}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(handleCancel).toHaveBeenCalledTimes(1);
  });

  it('Submit calls PaymentsClient.createPayment', async () => {
    vi.mocked(PaymentsClient.createPayment).mockResolvedValue({} as any);

    render(
      <PaymentCollectionForm
        orderId={mockOrderId}
        orderTotal={mockOrderTotal}
        totalPaid={mockTotalPaid}
        onPaymentSuccess={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const submitButton = screen.getByRole('button', { name: /record payment/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(PaymentsClient.createPayment).toHaveBeenCalledTimes(1);
      expect(PaymentsClient.createPayment).toHaveBeenCalledWith(mockOrderId, {
        amount: 1000,
        payment_method: 'UPI',
        reference: null,
      });
    });
  });

  it('calls onPaymentSuccess after successful submit', async () => {
    const handleSuccess = vi.fn();
    vi.mocked(PaymentsClient.createPayment).mockResolvedValue({} as any);

    render(
      <PaymentCollectionForm
        orderId={mockOrderId}
        orderTotal={mockOrderTotal}
        totalPaid={mockTotalPaid}
        onPaymentSuccess={handleSuccess}
        onCancel={vi.fn()}
      />
    );

    const submitButton = screen.getByRole('button', { name: /record payment/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(handleSuccess).toHaveBeenCalledTimes(1);
    });
  });

  it('submits customized payment method and reference', async () => {
    vi.mocked(PaymentsClient.createPayment).mockResolvedValue({} as any);

    const { container } = render(
      <PaymentCollectionForm
        orderId={mockOrderId}
        orderTotal={mockOrderTotal}
        totalPaid={mockTotalPaid}
        onPaymentSuccess={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const amountInput = screen.getByPlaceholderText('e.g. 500');
    fireEvent.change(amountInput, { target: { value: '500' } });

    const methodSelect = container.querySelector('select[name="payment_method"]') as HTMLSelectElement;
    fireEvent.change(methodSelect, { target: { value: 'CASH' } });

    const refInput = screen.getByPlaceholderText('Transaction ID, Cheque No, etc.');
    fireEvent.change(refInput, { target: { value: 'REC-1234' } });

    const submitButton = screen.getByRole('button', { name: /record payment/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(PaymentsClient.createPayment).toHaveBeenCalledWith(mockOrderId, {
        amount: 500,
        payment_method: 'CASH',
        reference: 'REC-1234',
      });
    });
  });

  it('shows alert on API error', async () => {
    vi.mocked(PaymentsClient.createPayment).mockRejectedValue(new Error('Gateway error'));

    render(
      <PaymentCollectionForm
        orderId={mockOrderId}
        orderTotal={mockOrderTotal}
        totalPaid={mockTotalPaid}
        onPaymentSuccess={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const submitButton = screen.getByRole('button', { name: /record payment/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Service error');
    });
  });

  it('disables inputs while submitting', async () => {
    let resolvePromise: (val: any) => void;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    vi.mocked(PaymentsClient.createPayment).mockImplementation(() => pendingPromise as any);

    const { container } = render(
      <PaymentCollectionForm
        orderId={mockOrderId}
        orderTotal={mockOrderTotal}
        totalPaid={mockTotalPaid}
        onPaymentSuccess={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const amountInput = screen.getByPlaceholderText('e.g. 500');
    const methodSelect = container.querySelector('select[name="payment_method"]') as HTMLSelectElement;
    const refInput = screen.getByPlaceholderText('Transaction ID, Cheque No, etc.');
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    const submitButton = screen.getByRole('button', { name: /record payment/i });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(amountInput).toBeDisabled();
      expect(methodSelect).toBeDisabled();
      expect(refInput).toBeDisabled();
      expect(cancelButton).toBeDisabled();
      expect(submitButton).toBeDisabled();
    });

    resolvePromise!({});
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });

  it('Submit button shows "Record Payment" normally, "Saving..." while submitting', async () => {
    let resolvePromise: (val: any) => void;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    vi.mocked(PaymentsClient.createPayment).mockImplementation(() => pendingPromise as any);

    render(
      <PaymentCollectionForm
        orderId={mockOrderId}
        orderTotal={mockOrderTotal}
        totalPaid={mockTotalPaid}
        onPaymentSuccess={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const submitButton = screen.getByRole('button', { name: /record payment/i });
    expect(submitButton).toHaveTextContent('Record Payment');

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(submitButton).toHaveTextContent('Saving...');
    });

    resolvePromise!({});
    await waitFor(() => {
      expect(submitButton).toHaveTextContent('Record Payment');
    });
  });

  it('shows validation error if amount is non-numeric', async () => {
    render(
      <PaymentCollectionForm
        orderId={mockOrderId}
        orderTotal={mockOrderTotal}
        totalPaid={mockTotalPaid}
        onPaymentSuccess={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const amountInput = screen.getByPlaceholderText('e.g. 500');
    fireEvent.change(amountInput, { target: { value: 'not-a-number' } });

    const submitButton = screen.getByRole('button', { name: /record payment/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/amount must be a valid number/i)).toBeInTheDocument();
    });
    expect(PaymentsClient.createPayment).not.toHaveBeenCalled();
  });
});
