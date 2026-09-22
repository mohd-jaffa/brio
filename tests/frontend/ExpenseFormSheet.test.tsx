// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ExpenseFormSheet } from '@/features/expenses/components/ExpenseFormSheet';
import { ExpensesClient } from '@/features/expenses/api.client';
import { type Expense } from '@/features/expenses/types';

vi.mock('@/features/expenses/api.client', () => ({
  ExpensesClient: {
    createExpense: vi.fn(),
    updateExpense: vi.fn(),
  },
}));

vi.mock('@/constants/messages', () => ({
  getErrorMessage: (msg: string) => msg,
  ERROR_MESSAGES: { EXTERNAL_SERVICE_ERROR: 'Service error' },
}));

describe('ExpenseFormSheet', () => {
  const mockExpense: Expense = {
    id: 'exp-123',
    category: 'Packaging',
    description: 'Cake boxes 500 pack',
    amount: 25000, // 250.00 rupees in paise
    expenseDate: '2026-03-15',
    paymentMethod: 'UPI',
    createdAt: '2026-03-15T00:00:00Z',
    updatedAt: '2026-03-15T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders nothing when isOpen=false', () => {
    const { container } = render(
      <ExpenseFormSheet isOpen={false} onClose={vi.fn()} onSuccess={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders "New Expense" title when isOpen, no initialData', () => {
    render(<ExpenseFormSheet isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /new expense/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('0.00')).toHaveValue(0);
    expect(screen.getByPlaceholderText('e.g. Flour and Sugar')).toHaveValue('');
  });

  it('renders "Edit Expense" when initialData provided', () => {
    render(
      <ExpenseFormSheet
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        initialData={mockExpense}
      />
    );

    expect(screen.getByRole('heading', { name: /edit expense/i })).toBeInTheDocument();
  });

  it('populates form from initialData (converts paise to rupees)', () => {
    const { container } = render(
      <ExpenseFormSheet
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        initialData={mockExpense}
      />
    );

    // 25000 paise converted to 250 rupees
    expect(screen.getByPlaceholderText('0.00')).toHaveValue(250);
    expect(screen.getByPlaceholderText('e.g. Flour and Sugar')).toHaveValue('Cake boxes 500 pack');

    const categorySelect = container.querySelector('select[name="category"]') as HTMLSelectElement;
    expect(categorySelect.value).toBe('Packaging');

    const dateInput = container.querySelector('input[type="date"]') as HTMLInputElement;
    expect(dateInput.value).toBe('2026-03-15');

    const paymentSelect = container.querySelector('select[name="paymentMethod"]') as HTMLSelectElement;
    expect(paymentSelect.value).toBe('UPI');
  });

  it('shows validation error for empty description', async () => {
    render(<ExpenseFormSheet isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);

    // Provide valid amount but leave description empty
    const amountInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(amountInput, { target: { value: '100' } });

    const submitButton = screen.getByRole('button', { name: /save expense/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Description is required')).toBeInTheDocument();
    });
    expect(ExpensesClient.createExpense).not.toHaveBeenCalled();
  });

  it('shows validation error for invalid amount (0 or negative)', async () => {
    const { container } = render(
      <ExpenseFormSheet isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />
    );

    const descInput = screen.getByPlaceholderText('e.g. Flour and Sugar');
    fireEvent.change(descInput, { target: { value: 'Vanilla Extract' } });

    const form = container.querySelector('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Amount must be greater than 0')).toBeInTheDocument();
    });
    expect(ExpensesClient.createExpense).not.toHaveBeenCalled();
  });

  it('calls createExpense with amount in paise on valid create', async () => {
    const handleSuccess = vi.fn();
    const handleClose = vi.fn();
    vi.mocked(ExpensesClient.createExpense).mockResolvedValue({ id: 'new-exp-1' } as any);

    const { container } = render(
      <ExpenseFormSheet isOpen={true} onClose={handleClose} onSuccess={handleSuccess} />
    );

    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '150.50' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. Flour and Sugar'), {
      target: { value: 'Flour & Sugar' },
    });

    const categorySelect = container.querySelector('select[name="category"]') as HTMLSelectElement;
    fireEvent.change(categorySelect, { target: { value: 'Ingredients' } });

    const paymentSelect = container.querySelector('select[name="paymentMethod"]') as HTMLSelectElement;
    fireEvent.change(paymentSelect, { target: { value: 'CASH' } });

    const submitButton = screen.getByRole('button', { name: /save expense/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(ExpensesClient.createExpense).toHaveBeenCalledTimes(1);
      expect(ExpensesClient.createExpense).toHaveBeenCalledWith({
        amount: 15050, // 150.50 * 100
        category: 'Ingredients',
        description: 'Flour & Sugar',
        expenseDate: expect.any(String),
        paymentMethod: 'CASH',
      });
      expect(handleSuccess).toHaveBeenCalledTimes(1);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  it('calls updateExpense for edit mode', async () => {
    const handleSuccess = vi.fn();
    const handleClose = vi.fn();
    vi.mocked(ExpensesClient.updateExpense).mockResolvedValue({ id: 'exp-123' } as any);

    render(
      <ExpenseFormSheet
        isOpen={true}
        onClose={handleClose}
        onSuccess={handleSuccess}
        initialData={mockExpense}
      />
    );

    // Change amount from 250 to 300
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '300' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. Flour and Sugar'), {
      target: { value: 'Cake boxes 600 pack' },
    });

    const submitButton = screen.getByRole('button', { name: /save expense/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(ExpensesClient.updateExpense).toHaveBeenCalledTimes(1);
      expect(ExpensesClient.updateExpense).toHaveBeenCalledWith('exp-123', {
        amount: 30000,
        category: 'Packaging',
        description: 'Cake boxes 600 pack',
        expenseDate: '2026-03-15',
        paymentMethod: 'UPI',
      });
      expect(handleSuccess).toHaveBeenCalledTimes(1);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  it('shows error message on API failure', async () => {
    vi.mocked(ExpensesClient.createExpense).mockRejectedValue(new Error('Failed to record expense'));

    render(<ExpenseFormSheet isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '50' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. Flour and Sugar'), {
      target: { value: 'Sprinkles' },
    });

    const submitButton = screen.getByRole('button', { name: /save expense/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to record expense')).toBeInTheDocument();
    });
  });

  it('shows fallback error message on non-Error API failure', async () => {
    vi.mocked(ExpensesClient.createExpense).mockRejectedValue({});

    render(<ExpenseFormSheet isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '50' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. Flour and Sugar'), {
      target: { value: 'Sprinkles' },
    });

    const submitButton = screen.getByRole('button', { name: /save expense/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Service error')).toBeInTheDocument();
    });
  });

  it('calls onClose when backdrop clicked', () => {
    const handleClose = vi.fn();
    const { container } = render(
      <ExpenseFormSheet isOpen={true} onClose={handleClose} onSuccess={vi.fn()} />
    );

    const backdrop = container.querySelector('div[aria-hidden="true"]');
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when X button clicked', () => {
    const handleClose = vi.fn();
    const { container } = render(
      <ExpenseFormSheet isOpen={true} onClose={handleClose} onSuccess={vi.fn()} />
    );

    const closeButton = container.querySelector('button svg.lucide-x')?.closest('button');
    expect(closeButton).not.toBeNull();
    fireEvent.click(closeButton!);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('disables submit while submitting', async () => {
    let resolvePromise: (val: any) => void;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    vi.mocked(ExpensesClient.createExpense).mockImplementation(() => pendingPromise as any);

    render(<ExpenseFormSheet isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '75' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. Flour and Sugar'), {
      target: { value: 'Baking Powder' },
    });

    const submitButton = screen.getByRole('button', { name: /save expense/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });

    resolvePromise!({ id: 'done' });
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });
});
