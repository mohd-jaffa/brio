import { roundToPaise } from '@/lib/money';

export const CURRENCY_SYMBOL = '₹';

export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return '—';
  const value = roundToPaise(amount);
  const hasFraction = Math.round(value * 100) % 100 !== 0;
  const formatted = value.toLocaleString('en-IN', {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  });
  return `${CURRENCY_SYMBOL}${formatted}`;
}
