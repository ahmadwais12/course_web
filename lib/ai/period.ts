/** Date-range resolution for business tools. Gemini may only pick a preset or ISO dates. */

export const PERIOD_KEYS = [
  'today',
  'yesterday',
  'this_week',
  'last_7_days',
  'this_month',
  'last_month',
  'last_30_days',
  'this_quarter',
  'this_year',
  'last_year',
  'custom',
] as const;

export type PeriodKey = (typeof PERIOD_KEYS)[number];

export type ResolvedPeriod = {
  key: PeriodKey;
  from: string;
  to: string;
  label: string;
};

export class ToolArgumentError extends Error {}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_SPAN_DAYS = 3 * 366;

export function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseISODate(value: unknown, field: string): Date {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) {
    throw new ToolArgumentError(`${field} must be a date in YYYY-MM-DD format`);
  }
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    throw new ToolArgumentError(`${field} is not a valid calendar date`);
  }
  return date;
}

function addDays(d: Date, n: number) {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
}

export function resolvePeriod(
  args: { period?: unknown; from?: unknown; to?: unknown },
  now: Date = new Date(),
  fallback: PeriodKey = 'this_month'
): ResolvedPeriod {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const requested = typeof args.period === 'string' ? args.period : undefined;
  const key: PeriodKey =
    requested && (PERIOD_KEYS as readonly string[]).includes(requested)
      ? (requested as PeriodKey)
      : args.from || args.to
        ? 'custom'
        : fallback;

  const range = (from: Date, to: Date, label: string): ResolvedPeriod => ({
    key,
    from: toISODate(from),
    to: toISODate(to),
    label,
  });

  switch (key) {
    case 'today':
      return range(today, today, 'Today');
    case 'yesterday': {
      const y = addDays(today, -1);
      return range(y, y, 'Yesterday');
    }
    case 'this_week': {
      // Afghan work week starts on Saturday (getDay() === 6).
      const offset = (today.getDay() + 1) % 7;
      return range(addDays(today, -offset), today, 'This week');
    }
    case 'last_7_days':
      return range(addDays(today, -6), today, 'Last 7 days');
    case 'last_30_days':
      return range(addDays(today, -29), today, 'Last 30 days');
    case 'this_month':
      return range(new Date(today.getFullYear(), today.getMonth(), 1), today, 'This month');
    case 'last_month': {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      return range(start, end, 'Last month');
    }
    case 'this_quarter': {
      const q = Math.floor(today.getMonth() / 3) * 3;
      return range(new Date(today.getFullYear(), q, 1), today, 'This quarter');
    }
    case 'this_year':
      return range(new Date(today.getFullYear(), 0, 1), today, 'This year');
    case 'last_year':
      return range(
        new Date(today.getFullYear() - 1, 0, 1),
        new Date(today.getFullYear() - 1, 11, 31),
        'Last year'
      );
    case 'custom': {
      const from = parseISODate(args.from, 'from');
      const to = args.to === undefined ? today : parseISODate(args.to, 'to');
      if (from > to) throw new ToolArgumentError('from must be on or before to');
      const span = (to.getTime() - from.getTime()) / 86_400_000;
      if (span > MAX_SPAN_DAYS) throw new ToolArgumentError('Date range cannot exceed 3 years');
      return range(from, to, `${toISODate(from)} to ${toISODate(to)}`);
    }
  }
}

/** The equally long window immediately before `period` (calendar month for month presets). */
export function previousPeriod(period: ResolvedPeriod): ResolvedPeriod {
  const [fy, fm, fd] = period.from.split('-').map(Number);
  const from = new Date(fy, fm - 1, fd);
  if (period.key === 'this_month' || period.key === 'last_month') {
    const start = new Date(from.getFullYear(), from.getMonth() - 1, 1);
    const end = new Date(from.getFullYear(), from.getMonth(), 0);
    return { key: 'custom', from: toISODate(start), to: toISODate(end), label: 'Previous month' };
  }
  const [ty, tm, td] = period.to.split('-').map(Number);
  const to = new Date(ty, tm - 1, td);
  const days = Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;
  const prevTo = addDays(from, -1);
  const prevFrom = addDays(prevTo, -(days - 1));
  return {
    key: 'custom',
    from: toISODate(prevFrom),
    to: toISODate(prevTo),
    label: 'Previous period',
  };
}

export function monthKey(isoDate: string) {
  return isoDate.slice(0, 7);
}
