// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ReceiptPrintView } from '@/features/receipts/components/ReceiptPrintView';
import { type ReceiptData } from '@/features/receipts/types';

describe('ReceiptPrintView', () => {
  const mockReceipt: ReceiptData = {
    order: {
      id: 'order-1',
      customerId: 'cust-1',
      orderNumber: 'ORD-001',
      status: 'PENDING',
      delivery: { type: 'PICKUP', date: '2026-10-10T10:00:00.000Z' },
      pricing: { subtotal: 1000, discount: 0, deliveryCharge: 0, tax: 50, total: 1050 },
      payment: { status: 'PAID', method: 'CASH' },
      adjustments: [],
      items: [
        {
          id: 'item-1',
          productId: 'prod-1',
          productName: 'Chocolate Cake',
          quantity: 2,
          unitPrice: 500,
          subtotal: 1000,
        }
      ],
      createdAt: '2026-10-09T10:00:00.000Z',
      updatedAt: '2026-10-09T10:00:00.000Z'
    },
    items: [
      {
        id: 'item-1',
        productId: 'prod-1',
        productName: 'Chocolate Cake',
        quantity: 2,
        unitPrice: 500,
        subtotal: 1000,
      }
    ],
    payments: [
      {
        id: 'pay-1',
        bakery_id: 'bakery-1',
        order_id: 'order-1',
        amount: 1050,
        payment_method: 'CASH',
        reference: null,
        paid_at: '2026-10-09T10:00:00.000Z',
        created_at: '2026-10-09T10:00:00.000Z'
      }
    ],
    bakeryName: 'My Awesome Bakery',
    generatedAt: '2026-10-09T10:00:00.000Z'
  };

  it('renders receipt data correctly', () => {
    const handleClose = vi.fn();
    render(<ReceiptPrintView receipt={mockReceipt} customerName="John Doe" customerPhone="1234567890" onClose={handleClose} />);

    // Should display bakery name
    expect(screen.getByText('My Awesome Bakery')).toBeDefined();
    
    // Should display customer name and phone
    expect(screen.getByText('John Doe')).toBeDefined();
    expect(screen.getByText('1234567890')).toBeDefined();

    // Should display items
    expect(screen.getByText('Chocolate Cake')).toBeDefined();
    expect(screen.getByText('2')).toBeDefined(); // Quantity

    // Should display payment method
    expect(screen.getByText('Payment: CASH (₹10.50)')).toBeDefined();
  });

  it('calls onClose when close button is clicked', () => {
    const handleClose = vi.fn();
    const { container } = render(<ReceiptPrintView receipt={mockReceipt} onClose={handleClose} />);
    
    // Using querySelector to find the close button (first button with X icon)
    const buttons = container.querySelectorAll('button');
    fireEvent.click(buttons[0]); // The close button is the first one
    
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls window.print when print button is clicked', () => {
    const handleClose = vi.fn();
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    
    render(<ReceiptPrintView receipt={mockReceipt} onClose={handleClose} />);
    
    const printButtons = screen.getAllByText('Print Receipt');
    fireEvent.click(printButtons[0]);
    
    expect(printSpy).toHaveBeenCalledTimes(1);
    printSpy.mockRestore();
  });
});
