import { describe, it, expect } from 'vitest';
import { formatCurrency } from '@/lib/format/currency';

describe('formatCurrency', () => {
  it('formats whole numbers without trailing zeroes', () => {
    expect(formatCurrency(1500)).toBe('₹1,500');
  });

  it('formats fractional amounts with 2 decimal places', () => {
    expect(formatCurrency(1500.5)).toBe('₹1,500.50');
    expect(formatCurrency(1500.75)).toBe('₹1,500.75');
  });

  it('handles null or undefined gracefully', () => {
    expect(formatCurrency(null)).toBe('—');
    expect(formatCurrency(undefined)).toBe('—');
  });
});
