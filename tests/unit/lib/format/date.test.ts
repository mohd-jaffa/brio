import { describe, it, expect } from 'vitest';
import {
  formatDate,
  formatDateTime,
  formatDayMonth,
  formatDaysAgo,
  formatLongDate,
  formatMonth,
  formatTime,
} from '@/lib/format/date';

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
    expect(formatDateTime('2026-09-22T10:30:00Z')).toBe('22 Sep 2026, 4:00 PM');
  });

  it('says nothing for a missing or unreadable time', () => {
    expect(formatDateTime(undefined)).toBe('—');
    expect(formatDateTime('soon')).toBe('—');
  });
});

describe('formatTime', () => {
  it('gives the time of day in the business clock', () => {
    expect(formatTime('2026-09-25T18:20:00Z')).toBe('11:50 PM');
    expect(formatTime('2026-09-26T03:30:00Z')).toBe('9:00 AM');
  });

  it('says nothing for a missing or unreadable time', () => {
    expect(formatTime(null)).toBe('—');
    expect(formatTime('not a time')).toBe('—');
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

describe('formatLongDate', () => {
  it('names the weekday before the date', () => {
    expect(formatLongDate('2026-09-26')).toBe('Saturday, 26 Sep 2026');
    expect(formatLongDate('2026-09-27')).toBe('Sunday, 27 Sep 2026');
  });

  it('shows a dash for a date it cannot read', () => {
    expect(formatLongDate(undefined)).toBe('—');
    expect(formatLongDate('26/09/2026')).toBe('—');
  });
});

describe('formatDaysAgo', () => {
  const now = new Date('2026-09-26T06:00:00Z'); // 11:30 in India

  it('counts the business days since, in words', () => {
    expect(formatDaysAgo('2026-09-25T20:00:00Z', now)).toBe('today'); // 1:30 on the 26th in India
    expect(formatDaysAgo('2026-09-25T05:00:00Z', now)).toBe('yesterday');
    expect(formatDaysAgo('2026-09-21T05:00:00Z', now)).toBe('5 days ago');
    expect(formatDaysAgo('2026-09-19T05:00:00Z', now)).toBe('a week ago');
    expect(formatDaysAgo('2026-09-05T05:00:00Z', now)).toBe('3 weeks ago');
    expect(formatDaysAgo('2026-08-20T05:00:00Z', now)).toBe('a month ago');
    expect(formatDaysAgo('2026-06-01T05:00:00Z', now)).toBe('3 months ago');
    expect(formatDaysAgo('2025-09-01T05:00:00Z', now)).toBe('a year ago');
    expect(formatDaysAgo('2023-09-01T05:00:00Z', now)).toBe('3 years ago');
  });

  it('never reads a later instant as the future', () => {
    expect(formatDaysAgo('2026-09-28T05:00:00Z', now)).toBe('today');
  });
});
