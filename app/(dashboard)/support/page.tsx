'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  EmptyState,
  ErrorBanner,
  PageHeader,
  PortButton,
  SectionPanel,
  StatCard,
  StatusChip,
  statusToneFromValue,
} from '@/components/ports';
import UserAvatar from '@/components/messaging/UserAvatar';
import { toast } from '@/components/ui/Toast';

type Count = { name: string; count: number };

type TrendPoint = { date: string; tickets: number; callbacks: number; messages: number };

type Person = { id: string; name: string; email: string | null; role: string; status: string };

type TicketRecent = {
  id: string;
  title: string | null;
  category: string | null;
  priority: string;
  status: string;
  created_at: string | null;
};

type CallbackRecent = {
  id: string;
  name: string | null;
  phone: string | null;
  topic: string | null;
  status: string;
  created_at: string | null;
};

type MessageRecent = {
  id: string;
  name: string | null;
  email: string | null;
  subject: string | null;
  status: string;
  created_at: string | null;
};

type Overview = {
  tickets: {
    total: number;
    open: number;
    resolved: number;
    byStatus: Count[];
    byPriority: Count[];
    byCategory: Count[];
    recent: TicketRecent[];
  };
  callbacks: { total: number; pending: number; byStatus: Count[]; recent: CallbackRecent[] };
  messages: { total: number; unread: number; recent: MessageRecent[] };
  social: { total: number; active: number; channels: { id: string; platform: string | null; status: string }[] };
  trend: TrendPoint[];
  people: Person[];
};

const SERIES = [
  { key: 'tickets', label: 'Tickets', color: '#38bdf8' },
  { key: 'callbacks', label: 'Callbacks', color: '#6bcbaa' },
  { key: 'messages', label: 'Messages', color: '#f0ce72' },
] as const;

const DONUT_COLORS = ['#38bdf8', '#2563eb', '#4f46e5', '#22d3ee', '#818cf8', '#94a3b8'];

const CHART_W = 720;
const CHART_H = 240;
const PAD = { top: 18, right: 16, bottom: 28, left: 34 };

function formatWhen(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function formatDay(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function niceMax(value: number) {
  if (value <= 4) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

function ViewAllLink({ href }: { href: string }) {
  return (
    <Link href={href} className="text-sm font-semibold text-primary hover:underline">
      View all
    </Link>
  );
}

function ActivityChart({ data, loading }: { data: TrendPoint[]; loading: boolean }) {
  const [active, setActive] = useState<number | null>(null);

  if (!data.length) {
    return <EmptyState message={loading ? 'Loading…' : 'No activity in the last 14 days.'} />;
  }

  const innerW = CHART_W - PAD.left - PAD.right;
  const innerH = CHART_H - PAD.top - PAD.bottom;
  const peak = Math.max(1, ...data.flatMap((point) => SERIES.map((series) => point[series.key])));
  const max = niceMax(peak);
  const xAt = (index: number) =>
    PAD.left + (data.length === 1 ? innerW / 2 : (index / (data.length - 1)) * innerW);
  const yAt = (value: number) => PAD.top + innerH - (value / max) * innerH;

  const linePath = (key: (typeof SERIES)[number]['key']) =>
    data
      .map((point, index) => `${index === 0 ? 'M' : 'L'}${xAt(index).toFixed(1)},${yAt(point[key]).toFixed(1)}`)
      .join(' ');

  const areaPath = (key: (typeof SERIES)[number]['key']) =>
    `${linePath(key)} L${xAt(data.length - 1).toFixed(1)},${PAD.top + innerH} L${xAt(0).toFixed(1)},${
      PAD.top + innerH
    } Z`;

  const labelIndices = data
    .map((_, index) => index)
    .filter((index) => index === 0 || index === data.length - 1 || index % 3 === 0);

  const handleMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width) return;
    const xView = ((event.clientX - rect.left) / rect.width) * CHART_W;
    const ratio = (xView - PAD.left) / innerW;
    const index = Math.round(ratio * (data.length - 1));
    setActive(Math.min(data.length - 1, Math.max(0, index)));
  };

  const activePoint = active === null ? null : data[active];
  const activeX = active === null ? 0 : xAt(active);
  const tooltipX = Math.min(Math.max(activeX + 14, PAD.left), CHART_W - 164);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-4">
        {SERIES.map((series) => {
          const total = data.reduce((sum, point) => sum + point[series.key], 0);
          return (
            <span key={series.key} className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: series.color }} />
              {series.label}
              <span className="text-foreground">{total}</span>
            </span>
          );
        })}
      </div>

      <svg
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        className="h-auto w-full touch-none select-none"
        role="img"
        aria-label="Support activity over the last 14 days"
        onPointerMove={handleMove}
        onPointerLeave={() => setActive(null)}
      >
        <defs>
          {SERIES.map((series) => (
            <linearGradient key={series.key} id={`grad-${series.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={series.color} stopOpacity="0.28" />
              <stop offset="100%" stopColor={series.color} stopOpacity="0.02" />
            </linearGradient>
          ))}
        </defs>

        {[0, 1, 2, 3, 4].map((tick) => {
          const value = (max / 4) * tick;
          const y = yAt(value);
          return (
            <g key={tick}>
              <line
                x1={PAD.left}
                x2={CHART_W - PAD.right}
                y1={y}
                y2={y}
                stroke="currentColor"
                className="text-border"
                strokeWidth={1}
              />
              <text x={PAD.left - 8} y={y + 3} textAnchor="end" fontSize={10} fill="currentColor" className="text-muted-foreground">
                {Math.round(value)}
              </text>
            </g>
          );
        })}

        {SERIES.map((series) => (
          <g key={series.key}>
            <path d={areaPath(series.key)} fill={`url(#grad-${series.key})`} />
            <path
              d={linePath(series.key)}
              fill="none"
              stroke={series.color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </g>
        ))}

        {labelIndices.map((index) => (
          <text
            key={index}
            x={xAt(index)}
            y={CHART_H - 8}
            textAnchor="middle"
            fontSize={10}
            fill="currentColor"
            className="text-muted-foreground"
          >
            {formatDay(data[index].date)}
          </text>
        ))}

        {active !== null && activePoint && (
          <g pointerEvents="none">
            <line
              x1={activeX}
              x2={activeX}
              y1={PAD.top}
              y2={PAD.top + innerH}
              stroke="currentColor"
              className="text-muted-foreground"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
            {SERIES.map((series) => (
              <circle
                key={series.key}
                cx={activeX}
                cy={yAt(activePoint[series.key])}
                r={3.5}
                fill={series.color}
                stroke="currentColor"
                className="text-card"
                strokeWidth={2}
              />
            ))}
            <g transform={`translate(${tooltipX}, ${PAD.top + 4})`}>
              <rect width={150} height={82} rx={10} fill="#0f172a" opacity={0.94} />
              <text x={12} y={20} fontSize={11} fontWeight={700} fill="#f8fafc">
                {formatDay(activePoint.date)}
              </text>
              {SERIES.map((series, index) => (
                <g key={series.key}>
                  <circle cx={15} cy={36 + index * 16} r={3} fill={series.color} />
                  <text x={24} y={39 + index * 16} fontSize={11} fill="#e2e8f0">
                    {series.label}
                  </text>
                  <text x={138} y={39 + index * 16} fontSize={11} fontWeight={700} fill="#ffffff" textAnchor="end">
                    {activePoint[series.key]}
                  </text>
                </g>
              ))}
            </g>
          </g>
        )}
      </svg>
    </div>
  );
}

function DonutChart({ items, total, loading }: { items: Count[]; total: number; loading: boolean }) {
  const visible = items.filter((item) => item.count > 0);
  if (!visible.length) {
    return <EmptyState message={loading ? 'Loading…' : 'No tickets recorded yet.'} />;
  }

  const sum = visible.reduce((acc, item) => acc + item.count, 0);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <div className="relative h-40 w-40 shrink-0">
        <svg viewBox="0 0 160 160" className="h-full w-full" role="img" aria-label="Tickets by status">
          <circle
            cx={80}
            cy={80}
            r={radius}
            fill="none"
            stroke="currentColor"
            className="text-muted"
            strokeWidth={16}
          />
          {visible.map((item, index) => {
            const length = (item.count / sum) * circumference;
            const dash = Math.max(length - 2, 1);
            const segment = (
              <circle
                key={item.name}
                cx={80}
                cy={80}
                r={radius}
                fill="none"
                stroke={DONUT_COLORS[index % DONUT_COLORS.length]}
                strokeWidth={16}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                transform="rotate(-90 80 80)"
              />
            );
            offset += length;
            return segment;
          })}
          <text x={80} y={76} textAnchor="middle" fontSize={26} fontWeight={700} fill="currentColor" className="text-foreground">
            {sum}
          </text>
          <text x={80} y={94} textAnchor="middle" fontSize={10} fill="currentColor" className="text-muted-foreground">
            of {total} tickets
          </text>
        </svg>
      </div>

      <ul className="m-0 w-full list-none space-y-2 p-0">
        {visible.map((item, index) => (
          <li key={item.name} className="flex items-center justify-between gap-2 text-sm">
            <span className="inline-flex min-w-0 items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: DONUT_COLORS[index % DONUT_COLORS.length] }}
              />
              <span className="truncate capitalize text-muted-foreground">{item.name}</span>
            </span>
            <span className="shrink-0 font-semibold text-foreground">
              {item.count}
              <span className="ms-1 text-xs font-normal text-muted-foreground">
                {Math.round((item.count / sum) * 100)}%
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Breakdown({
  items,
  emptyMessage,
  color = '#2563eb',
}: {
  items: Count[];
  emptyMessage: string;
  color?: string;
}) {
  const max = Math.max(1, ...items.map((item) => item.count));
  if (!items.length) return <EmptyState message={emptyMessage} />;
  return (
    <ul className="m-0 list-none space-y-3 p-0">
      {items.map((item) => (
        <li key={item.name}>
          <div className="mb-1 flex items-center justify-between gap-2">
            <StatusChip label={item.name} tone={statusToneFromValue(item.name)} />
            <span className="text-sm font-semibold text-foreground">{item.count}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full"
              style={{ width: `${(item.count / max) * 100}%`, backgroundColor: color }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function SupportOverviewPage() {
  const router = useRouter();
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/support/dashboard', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load support overview');
      setData(json as Overview);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load support overview';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const tickets = data?.tickets;
  const callbacks = data?.callbacks;
  const messages = data?.messages;
  const social = data?.social;
  const people = data?.people ?? [];
  const loadingLabel = loading ? 'Loading…' : 'Nothing here yet.';

  return (
    <>
      <PageHeader
        title="Support Overview"
        description="Call center, support tickets, inbox messages, and social channels at a glance."
        actions={
          <>
            <PortButton variant="ghost" onClick={load} disabled={loading}>
              Refresh
            </PortButton>
            <PortButton variant="secondary" onClick={() => router.push('/support/call-center')}>
              Call center
            </PortButton>
            <PortButton variant="primary" onClick={() => router.push('/support/tickets')}>
              Support tickets
            </PortButton>
          </>
        }
      />

      {error && (
        <div className="mb-4 space-y-2">
          <ErrorBanner message={error} />
          <PortButton variant="secondary" onClick={load}>
            Retry
          </PortButton>
        </div>
      )}

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            accent="blue"
            label="Open tickets"
            value={tickets ? tickets.open : '—'}
            hint={tickets ? `${tickets.total} total · ${tickets.resolved} resolved` : 'Support tickets'}
          />
          <StatCard
            accent="gold"
            label="Pending callbacks"
            value={callbacks ? callbacks.pending : '—'}
            hint={callbacks ? `${callbacks.total} requests` : 'Callback requests'}
          />
          <StatCard
            accent="purple"
            label="Unread messages"
            value={messages ? messages.unread : '—'}
            hint={messages ? `${messages.total} total` : 'Contact inbox'}
          />
          <StatCard
            accent="green"
            label="Active social channels"
            value={social ? social.active : '—'}
            hint={social ? `${social.total} configured` : 'Social media'}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <SectionPanel
            className="lg:col-span-2"
            title="Support activity"
            description="New tickets, callbacks, and inbox messages over the last 14 days."
            headerRight={
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                14-day trend
              </span>
            }
          >
            <ActivityChart data={data?.trend ?? []} loading={loading} />
          </SectionPanel>

          <SectionPanel title="Ticket status" description="Distribution across every status.">
            <DonutChart items={tickets?.byStatus ?? []} total={tickets?.total ?? 0} loading={loading} />
          </SectionPanel>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <SectionPanel title="Tickets by priority" description="Urgency mix of all tickets.">
            <Breakdown items={tickets?.byPriority ?? []} emptyMessage={loadingLabel} color="#f0ce72" />
          </SectionPanel>
          <SectionPanel title="Tickets by category" description="Most common issue types.">
            <Breakdown items={tickets?.byCategory ?? []} emptyMessage={loadingLabel} color="#6bcbaa" />
          </SectionPanel>
          <SectionPanel title="Callbacks by status" description="Where callback requests stand.">
            <Breakdown items={callbacks?.byStatus ?? []} emptyMessage={loadingLabel} color="#b9a7f2" />
          </SectionPanel>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <SectionPanel
            title="People"
            description="Newest user accounts in the system."
            headerRight={<ViewAllLink href="/users" />}
            bodyClassName="p-0"
          >
            {!people.length ? (
              <div className="p-4 sm:p-5">
                <EmptyState message={loadingLabel} />
              </div>
            ) : (
              <ul className="m-0 list-none p-0">
                {people.map((person) => (
                  <li
                    key={person.id}
                    className="flex items-center gap-3 border-b border-border/60 px-4 py-3 last:border-b-0"
                  >
                    <UserAvatar name={person.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="m-0 truncate text-sm font-semibold text-foreground">{person.name}</p>
                      <p className="m-0 truncate text-xs text-muted-foreground">
                        {person.email || 'No email on file'}
                      </p>
                    </div>
                    <span className="hidden shrink-0 rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-semibold capitalize text-muted-foreground sm:inline">
                      {person.role.replace(/_/g, ' ')}
                    </span>
                    <StatusChip label={person.status} tone={statusToneFromValue(person.status)} />
                  </li>
                ))}
              </ul>
            )}
          </SectionPanel>

          <SectionPanel
            className="lg:col-span-2"
            title="Recent tickets"
            description="Latest issues reported."
            headerRight={<ViewAllLink href="/support/tickets" />}
            bodyClassName="p-0"
          >
            {!tickets?.recent.length ? (
              <div className="p-4 sm:p-5">
                <EmptyState message={loadingLabel} />
              </div>
            ) : (
              <ul className="m-0 list-none p-0">
                {tickets.recent.map((row) => (
                  <li key={row.id} className="border-b border-border/60 last:border-b-0">
                    <Link
                      href="/support/tickets"
                      className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-muted/60"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="m-0 truncate text-sm font-semibold text-foreground">
                          {row.title || 'Untitled ticket'}
                        </p>
                        <p className="m-0 text-xs text-muted-foreground">
                          {row.category || 'Uncategorized'} · {formatWhen(row.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusChip label={row.priority} tone={statusToneFromValue(row.priority)} />
                        <StatusChip label={row.status} tone={statusToneFromValue(row.status)} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionPanel>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <SectionPanel
            title="Recent callback requests"
            description="People waiting for a call."
            headerRight={<ViewAllLink href="/support/call-center" />}
            bodyClassName="p-0"
          >
            {!callbacks?.recent.length ? (
              <div className="p-4 sm:p-5">
                <EmptyState message={loadingLabel} />
              </div>
            ) : (
              <ul className="m-0 list-none p-0">
                {callbacks.recent.map((row) => (
                  <li key={row.id} className="border-b border-border/60 last:border-b-0">
                    <Link
                      href="/support/call-center"
                      className="flex items-center justify-between gap-2 px-4 py-3 hover:bg-muted/60"
                    >
                      <div className="min-w-0">
                        <p className="m-0 truncate text-sm font-semibold text-foreground">
                          {row.name || 'Unknown caller'}
                        </p>
                        <p className="m-0 truncate text-xs text-muted-foreground">
                          {row.topic || 'General'} · {row.phone || 'No phone'}
                        </p>
                      </div>
                      <StatusChip label={row.status} tone={statusToneFromValue(row.status)} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionPanel>

          <SectionPanel
            title="Recent contact messages"
            description="Latest inbox submissions."
            headerRight={<ViewAllLink href="/support/messages" />}
            bodyClassName="p-0"
          >
            {!messages?.recent.length ? (
              <div className="p-4 sm:p-5">
                <EmptyState message={loadingLabel} />
              </div>
            ) : (
              <ul className="m-0 list-none p-0">
                {messages.recent.map((row) => (
                  <li key={row.id} className="border-b border-border/60 last:border-b-0">
                    <Link
                      href="/support/messages"
                      className="flex items-center justify-between gap-2 px-4 py-3 hover:bg-muted/60"
                    >
                      <div className="min-w-0">
                        <p className="m-0 truncate text-sm font-semibold text-foreground">
                          {row.subject || 'No subject'}
                        </p>
                        <p className="m-0 truncate text-xs text-muted-foreground">
                          {row.name || row.email || 'Unknown sender'} · {formatWhen(row.created_at)}
                        </p>
                      </div>
                      <StatusChip label={row.status} tone={statusToneFromValue(row.status)} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionPanel>
        </div>

        <SectionPanel
          title="Social channels"
          description="Channels linked to the institute."
          headerRight={<ViewAllLink href="/support/social" />}
        >
          {!social?.channels.length ? (
            <EmptyState message={loadingLabel} />
          ) : (
            <div className="flex flex-wrap gap-2">
              {social.channels.map((channel) => (
                <span
                  key={channel.id}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1.5 text-sm text-foreground"
                >
                  {channel.platform || 'Channel'}
                  <StatusChip label={channel.status} tone={statusToneFromValue(channel.status)} />
                </span>
              ))}
            </div>
          )}
        </SectionPanel>
      </div>
    </>
  );
}
