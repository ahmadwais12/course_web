/** Locale-safe number, price, and phone formatting shared across the UI. */

const formatters = new Map<number, Intl.NumberFormat>();

function numberFormat(maxDecimals: number) {
  let formatter = formatters.get(maxDecimals);
  if (!formatter) {
    formatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: maxDecimals });
    formatters.set(maxDecimals, formatter);
  }
  return formatter;
}

export function toAmount(value: unknown): number | null {
  if (value == null || value === '') return null;
  const amount =
    typeof value === 'number' ? value : Number(String(value).replace(/,/g, '').trim());
  return Number.isFinite(amount) ? amount : null;
}

/** 1250000 -> "1,250,000" */
export function formatNumber(value: unknown, maxDecimals = 2): string {
  const amount = toAmount(value);
  if (amount == null) return '';
  return numberFormat(maxDecimals).format(amount);
}

/** 1250000 -> "AFN 1,250,000" (currency omitted when blank). */
export function formatPrice(value: unknown, currency = 'AFN'): string {
  const amount = toAmount(value);
  if (amount == null) return '—';
  const formatted = numberFormat(2).format(amount);
  return currency ? `${currency} ${formatted}` : formatted;
}

export function parseAmount(value: string): number | null {
  return toAmount(value);
}

/** Formats a price input while typing: strips junk, groups thousands, keeps 2 decimals. */
export function formatAmountInput(value: string): string {
  const cleaned = value.replace(/[^\d.]/g, '');
  if (!cleaned) return '';
  const [whole, ...rest] = cleaned.split('.');
  const grouped = whole.replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const decimals = rest.join('').slice(0, 2);
  return rest.length ? `${grouped || '0'}.${decimals}` : grouped;
}

/** Stores phone numbers as E.164 (+93700000000) when a country code is present. */
export function normalizePhone(value: unknown): string {
  const text = String(value ?? '').trim();
  if (!text) return '';
  const international = text.startsWith('+') || text.startsWith('00');
  let digits = text.replace(/\D/g, '');
  if (international && digits.startsWith('00')) digits = digits.slice(2);
  if (!digits) return '';
  return international ? `+${digits}` : digits;
}

/** +93700000000 -> "+93 70 000 0000", +15551234567 -> "+1 (555) 123-4567". */
export function formatPhone(value: unknown): string {
  const e164 = normalizePhone(value);
  if (!e164) return '';
  if (!e164.startsWith('+')) return e164;
  const digits = e164.slice(1);
  if (digits.startsWith('93') && digits.length === 11) {
    return `+93 ${digits.slice(2, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }
  if (digits.startsWith('1') && digits.length === 11) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return e164;
}
