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

/** An instant's parts on the business's clock, or null for no instant or an unreadable one. */
function clock(iso: string | null | undefined): Record<string, string> | null {
  const date = iso ? new Date(iso) : null;
  if (!date || Number.isNaN(date.getTime())) return null;
  return Object.fromEntries(PARTS.formatToParts(date).map((part) => [part.type, part.value]));
}

export function formatDateTime(iso: string | null | undefined): string {
  const part = clock(iso);
  if (!part) return '—';
  return `${part.day} ${MONTHS[Number(part.month) - 1]} ${part.year}, ${part.hour}:${part.minute} ${part.dayPeriod.toUpperCase()}`;
}

/** The time of day in the business's clock: "11:50 PM". */
export function formatTime(iso: string | null | undefined): string {
  const part = clock(iso);
  if (!part) return '—';
  return `${part.hour}:${part.minute} ${part.dayPeriod.toUpperCase()}`;
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

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** A day in full, for a heading: "Saturday, 26 Sep 2026". */
export function formatLongDate(isoDate: string | null | undefined): string {
  const day = formatDate(isoDate);
  if (day === '—') return day;
  return `${WEEKDAYS[new Date(`${isoDate}T00:00:00Z`).getUTCDay()]}, ${day}`;
}
