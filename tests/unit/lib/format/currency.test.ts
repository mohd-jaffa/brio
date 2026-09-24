import { describe, it, expect } from 'vitest';
import { formatCurrency, formatPaise } from '@/lib/format/currency';

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

describe('formatPaise', () => {
  it('reads whole paise as rupees, because that is what the app stores', () => {
    expect(formatPaise(49950)).toBe('₹499.50');
    expect(formatPaise(150000)).toBe('₹1,500');
    expect(formatPaise(0)).toBe('₹0');
  });

  it('says nothing rather than zero when there is no figure', () => {
    expect(formatPaise(null)).toBe('—');
    expect(formatPaise(undefined)).toBe('—');
  });
});
