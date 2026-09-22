const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const PARTS = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Kolkata',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

export function formatDate(isoDate: string | null | undefined): string {
  const match = isoDate ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate) : null;
  if (!match) return '—';
  return `${Number(match[3])} ${MONTHS[Number(match[2]) - 1]} ${match[1]}`;
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    PARTS.formatToParts(date).find((p) => p.type === type)?.value ?? '';
  return `${part('day')} ${MONTHS[Number(part('month')) - 1]} ${part('year')}, ${part('hour')}:${part('minute')} ${part('dayPeriod').toUpperCase()}`;
}

/** The month a date falls in, for grouping a list by it: "Sep 2026". */
export function formatMonth(isoDate: string | null | undefined): string {
  const match = isoDate ? /^(\d{4})-(\d{2})/.exec(isoDate) : null;
  if (!match) return '—';
  return `${MONTHS[Number(match[2]) - 1]} ${match[1]}`;
}

/** A date without its year, for a row where the year is already obvious: "13 Oct". */
export function formatDayMonth(isoDate: string | null | undefined): string {
  const match = isoDate ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate) : null;
  if (!match) return '—';
  return `${Number(match[3])} ${MONTHS[Number(match[2]) - 1]}`;
}
