/**
 * Rounds an amount to the paisa the way the database's round(x, 2) does:
 * half away from zero, on the decimal digits as written.
 */
export function roundToPaise(amount: number): number {
  const magnitude = Math.abs(amount);
  const digits = magnitude.toPrecision(15);
  const paise = digits.includes('e') ? Math.round(magnitude * 100) : Math.round(Number(`${digits}e2`));
  const rounded = paise / 100;
  return amount < 0 && rounded !== 0 ? -rounded : rounded;
}
