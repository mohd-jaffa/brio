import { describe, it, expect } from 'vitest';
import { formatDate, formatDateTime } from '@/lib/format/date';

describe('formatDate', () => {
  it('formats ISO calendar dates cleanly', () => {
    expect(formatDate('2026-10-13')).toBe('13 Oct 2026');
  });

  it('returns dash for invalid dates', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate('')).toBe('—');
  });
});

describe('formatDateTime', () => {
  it('formats full ISO timestamp to Indian date and time', () => {
    const result = formatDateTime('2026-09-22T10:30:00Z');
    expect(result).toContain('2026');
    expect(result).not.toBe('—');
  });
});
