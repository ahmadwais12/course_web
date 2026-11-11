const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function money(value: number | null | undefined, currency = 'AFN') {
  const amount = Number(value ?? 0);
  return `${currency} ${amount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function compactMoney(value: number | null | undefined, currency = 'AFN') {
  const amount = Number(value ?? 0);
  if (Math.abs(amount) >= 1_000_000) return `${currency} ${(amount / 1_000_000).toFixed(1)}M`;
  if (Math.abs(amount) >= 1_000) return `${currency} ${(amount / 1_000).toFixed(1)}k`;
  return money(amount, currency);
}

export function dateLabel(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export function monthKeyLabel(key: string | null | undefined) {
  if (!key) return '—';
  const [year, month] = key.split('-');
  const index = Number(month) - 1;
  return MONTHS[index] ? `${MONTHS[index]} ${year}` : key;
}

export function monthShort(key: string) {
  const index = Number(key.slice(5, 7)) - 1;
  return MONTHS[index] ?? key;
}
