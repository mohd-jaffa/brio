import { describe, it, expect } from 'vitest';
import { formatDate, formatDateTime, formatDayMonth, formatMonth } from '@/lib/format/date';

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

describe('formatMonth', () => {
  it('names the month a date falls in, for grouping a list', () => {
    expect(formatMonth('2026-09-22')).toBe('Sep 2026');
  });

  it('returns a dash for nothing', () => {
    expect(formatMonth(null)).toBe('—');
  });
});

describe('formatDayMonth', () => {
  it('drops the year where the year is already obvious', () => {
    expect(formatDayMonth('2026-10-13')).toBe('13 Oct');
  });

  it('returns a dash for nothing', () => {
    expect(formatDayMonth('')).toBe('—');
  });
});
