import { describe, it, expect } from 'vitest';
import { roundToPaise } from '@/lib/money';

describe('roundToPaise', () => {
  it('rounds positive numbers to 2 decimal places', () => {
    expect(roundToPaise(10.505)).toBe(10.51);
    expect(roundToPaise(10.504)).toBe(10.5);
    expect(roundToPaise(100)).toBe(100);
  });

  it('handles negative numbers correctly', () => {
    expect(roundToPaise(-10.505)).toBe(-10.51);
    expect(roundToPaise(-10.504)).toBe(-10.5);
  });
});
