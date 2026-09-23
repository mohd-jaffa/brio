const INDIA_COUNTRY_CODE = '91';


/**
 * Accepts a bare 10-digit number, one already prefixed with 91 or +91, or a
 * leading-0 trunk-prefixed number. Indian mobile numbers start 6-9.
 * Returns null if invalid.
 */
export function toE164India(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');

  let national: string | null = null;
  if (digits.length === 10) {
    national = digits;
  } else if (digits.length === 11 && digits.startsWith('0')) {
    national = digits.slice(1);
  } else if (digits.length === 12 && digits.startsWith(INDIA_COUNTRY_CODE)) {
    national = digits.slice(2);
  }

  if (!national || !/^[6-9]\d{9}$/.test(national)) return null;
  return `+${INDIA_COUNTRY_CODE}${national}`;
}

export function maskPhone(e164: string): string {
  const last4 = e164.slice(-4);
  return `+91••••${last4}`;
}

export function formatPhoneDigits(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length > 10) {
    digits = digits.slice(2);
  } else if (digits.startsWith('0') && digits.length > 10) {
    digits = digits.slice(1);
  }
  const national = digits.slice(0, 10);
  if (national.length <= 5) return national;
  return `${national.slice(0, 5)} ${national.slice(5)}`;
}
