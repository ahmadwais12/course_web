'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useTheme } from '@/context/ThemeContext';
import CityMap, { type CityStats } from '@/components/dashboards/CityMap';
import { daysAgo, detectPreset, presetRange, type DatePreset } from '@/components/dashboards/DateFilterBar';
import '@/app/dashboard-kms.css';

type TrendPoint = {
  date: string;
  count: number;
  values: Record<string, number>;
};

type ChannelRow = {
  name: string;
  total: number;
  values: number[];
  success: number;
};

type DealRow = {
  name: string;
  total: number;
  values: number[];
  rate: number;
  subcategories?: { key: string; total: number; values: number[]; rate: number }[];
};

type AttentionRow = {
  id: string;
  customer: string;
  contact_number?: string;
  method?: string;
  deal?: string;
  status: string;
  vehicle?: string;
  last?: string;
  days?: number;
  link?: string;
};

type DashboardData = {
  students?: number;
  courses?: number;
  staff?: number;
  revenue?: number;
  total?: number;
  statuses?: Record<string, number>;
  payment_statuses?: Record<string, number>;
  enrollment_statuses?: Record<string, number>;
  attention_total?: number;
  attention?: AttentionRow[];
  trend?: TrendPoint[];
  trend_event_total?: number;
  channels?: ChannelRow[];
  deals?: DealRow[];
  vehicles?: { name: string; total: number }[];
  locations?: CityStats[];
  interactions?: number;
  success_rate?: number;
  period?: { from: string; to: string };
  filter_options?: { methods: string[]; statuses: string[]; cities?: string[] };
  error?: string;
};

const METRIC_STATUSES = [
  { name: 'completed', label: 'Completed', color: 'green', hex: '#6bcbaa' },
  { name: 'pending', label: 'Pending', color: 'gold', hex: '#f0ce72' },
  { name: 'failed', label: 'Failed', color: 'purple', hex: '#c6a2ed' },
  { name: 'refunded', label: 'Refunded', color: 'gray', hex: '#91a0b0' },
  { name: 'active', label: 'Active enroll', color: 'blue', hex: '#82b0f5' },
] as const;

const TREND_SERIES = [
  { name: 'enrollments', label: 'Enrollments', hex: '#2563eb' },
  { name: 'payments', label: 'Payments', hex: '#38bdf8' },
  { name: 'students', label: 'New students', hex: '#4f46e5' },
] as const;

const DATE_PRESETS: { id: DatePreset; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
  { id: '90d', label: '90 days' },
];

function statusChipClass(status: string) {
  if (status === 'pending') return 'status-chip gold-chip';
  if (status === 'failed' || status === 'refunded') return 'status-chip purple-chip';
  return 'status-chip';
}

export default function AdminDashboard({ stats }: { stats: DashboardData | null }) {
  const { resolvedTheme } = useTheme();
  const [filters, setFilters] = useState({
    from: daysAgo(29),
    to: daysAgo(0),
    method: '',
    status: '',
    city: '',
  });
  const [data, setData] = useState<DashboardData | null>(stats);
  const [loading, setLoading] = useState(!stats);
  const [loadError, setLoadError] = useState('');
  const [expandedDealRows, setExpandedDealRows] = useState<Record<string, boolean>>({});

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const params = new URLSearchParams({
        from: filters.from,
        to: filters.to,
        ...(filters.method ? { method: filters.method } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.city ? { city: filters.city } : {}),
      });
      const res = await fetch(`/api/dashboard/stats?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not load dashboard data.');
      setData(json);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const t = setTimeout(() => fetchDashboard(), 200);
    return () => clearTimeout(t);
  }, [fetchDashboard]);

  useEffect(() => {
    if (stats && !data) setData(stats);
  }, [stats, data]);

  const dash = data || {};
  const statuses = dash.statuses || {};
  const trend = dash.trend || [];
  const channels = dash.channels || [];
  const deals = dash.deals || [];
  const vehicles = dash.vehicles || [];
  const attention = dash.attention || [];
  const locations = dash.locations || [];
  const activePreset = detectPreset(filters.from, filters.to);

  const enrollmentsDeal = deals.find((d) => d.name === 'Enrollments');
  const paymentsDeal = deals.find((d) => d.name === 'Payments');
  const enrollTotal = enrollmentsDeal?.total || 0;
  const payTotal = paymentsDeal?.total || 0;
  const dealTotal = enrollTotal + payTotal || 1;
  const successRate = dash.success_rate ?? 0;
  const completedPayments = dash.payment_statuses?.completed || statuses.completed || 0;

  const trendMax = useMemo(
    () => Math.max(1, ...trend.flatMap((p) => TREND_SERIES.map((s) => Number(p.values?.[s.name] || 0)))),
    [trend]
  );
  const trendTicks = [trendMax, Math.round((trendMax * 2) / 3), Math.round(trendMax / 3), 0];
  const trendX = (index: number) => (trend.length < 2 ? 525 : 70 + (index * 910) / (trend.length - 1));
  const trendY = (count: number) => 198 - (Number(count || 0) / trendMax) * 160;
  const trendPoints = (name: string) =>
    trend.map((point, index) => `${trendX(index)},${trendY(point.values?.[name] || 0)}`).join(' ');
  const trendAxisLabels = useMemo(() => {
    const lastIndex = trend.length - 1;
    if (lastIndex < 0) return [];
    return [...new Set([0, Math.round(lastIndex / 4), Math.round(lastIndex / 2), Math.round((lastIndex * 3) / 4), lastIndex])].map(
      (index) => ({
        index,
        x: trendX(index),
        label: new Date(`${trend[index].date}T00:00:00`).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trend, trendMax]);

  const snapshot = new Date().toLocaleString('en-US', {
    timeZone: 'Asia/Kabul',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const cityOptions = dash.filter_options?.cities?.length
    ? dash.filter_options.cities
    : locations.map((row) => row.name);

  return (
    <main className={`emis-inquiry-dashboard ${resolvedTheme === 'dark' ? 'theme-dark' : 'theme-light'}`}>
      <header className="dash-heading">
        <div>
          <h1>Overall Dashboard</h1>
          <p>
            Institute activity, enrollments, payments and follow-up
            {filters.city ? ` · ${filters.city}` : ''}
          </p>
        </div>
        <span className={`data-source-pill ${loadError ? 'offline-pill' : ''}`}>
          {loadError ? 'API UNAVAILABLE' : loading ? 'LOADING API DATA' : 'LIVE API DATA'}
        </span>
      </header>

      {loading && !data && <div className="page-message">Loading dashboard data...</div>}
      {loadError && !data && <div className="page-message error-message">{loadError}</div>}

      {(data || !loading) && (
        <>
          {loadError && data && (
            <div className="page-message error-message" role="alert">
              Could not refresh dashboard data. Showing the last successful response. {loadError}
            </div>
          )}

          <div className="dash-presets" role="group" aria-label="Date range">
            {DATE_PRESETS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`dash-preset${activePreset === item.id ? ' is-active' : ''}`}
                onClick={() => setFilters((f) => ({ ...f, ...presetRange(item.id) }))}
              >
                {item.label}
              </button>
            ))}
          </div>

          <section className="filters" aria-label="Dashboard filters">
            <label>
              From
              <input
                type="date"
                value={filters.from}
                onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
              />
            </label>
            <label>
              To
              <input
                type="date"
                value={filters.to}
                onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
              />
            </label>
            <label>
              City
              <select
                value={filters.city}
                onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))}
              >
                <option value="">All cities</option>
                {cityOptions.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Payment method
              <select
                value={filters.method}
                onChange={(e) => setFilters((f) => ({ ...f, method: e.target.value }))}
              >
                <option value="">All methods</option>
                {(dash.filter_options?.methods || []).map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Payment status
              <select
                value={filters.status}
                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
              >
                <option value="">All statuses</option>
                {(dash.filter_options?.statuses || METRIC_STATUSES.map((s) => s.name)).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="button secondary"
              onClick={() =>
                setFilters({ from: daysAgo(29), to: daysAgo(0), method: '', status: '', city: '' })
              }
            >
              All dates
            </button>
            <button type="button" className="button secondary" onClick={() => fetchDashboard()}>
              Refresh
            </button>
            <Link href="/students" className="button primary" style={{ display: 'inline-flex', alignItems: 'center' }}>
              View students
            </Link>
          </section>

          <section className="stats">
            <article className="panel stat">
              <small>Total students</small>
              <strong>{dash.students ?? 0}</strong>
              <span>{filters.city || 'Selected period'}</span>
            </article>
            <article className="panel stat">
              <small>Courses</small>
              <strong className="blue">{dash.courses ?? 0}</strong>
              <span>Active catalog</span>
            </article>
            <article className="panel stat">
              <small>Staff</small>
              <strong className="purple">{dash.staff ?? 0}</strong>
              <span>Team members</span>
            </article>
            <article className="panel stat">
              <small>Revenue</small>
              <strong className="green">${Number(dash.revenue || 0).toLocaleString()}</strong>
              <span>Completed payments</span>
            </article>
            <article className="panel stat">
              <small>Completed</small>
              <strong className="green">{statuses.completed || 0}</strong>
              <span>Payment status</span>
            </article>
            <article className="panel stat">
              <small>Pending</small>
              <strong className="gold">{statuses.pending || 0}</strong>
              <span>Payment status</span>
            </article>
            <article className="panel stat">
              <small>Needs Attention</small>
              <strong className="gold">{dash.attention_total || 0}</strong>
              <span>Follow-up required</span>
            </article>
          </section>

          <section className="mid-grid">
            <article className="panel trend-card">
              <div className="card-heading trend-heading">
                <div>
                  <h2>Activity trend</h2>
                  <p>
                    {dash.period?.from} – {dash.period?.to} | Enrollments, payments &amp; new students
                  </p>
                </div>
                <div className="trend-total">
                  <span>Events in period</span>
                  <strong>{Number(dash.trend_event_total || 0).toLocaleString()}</strong>
                </div>
              </div>
              <div className="trend-chart-wrap">
                <svg className="trend-chart" viewBox="0 0 1000 240" preserveAspectRatio="none" role="img" aria-label="Activity trend">
                  <g className="trend-grid">
                    {trendTicks.map((tick, index) => (
                      <line key={`g-${index}`} x1="65" y1={30 + index * 56} x2="990" y2={30 + index * 56} />
                    ))}
                    {trendTicks.map((tick, index) => (
                      <text key={`t-${index}`} x="52" y={34 + index * 56} textAnchor="end">
                        {tick}
                      </text>
                    ))}
                  </g>
                  {TREND_SERIES.map((series) => (
                    <polyline
                      key={series.name}
                      points={trendPoints(series.name)}
                      className="trend-line"
                      style={{ stroke: series.hex }}
                    />
                  ))}
                  <g className="trend-axis-labels">
                    {trendAxisLabels.map((label) => (
                      <text
                        key={label.index}
                        x={label.x}
                        y="230"
                        textAnchor={
                          label.index === 0 ? 'start' : label.index === trend.length - 1 ? 'end' : 'middle'
                        }
                      >
                        {label.label}
                      </text>
                    ))}
                  </g>
                </svg>
              </div>
              <div className="trend-legend">
                {TREND_SERIES.map((s) => (
                  <span key={s.name}>
                    <i style={{ background: s.hex }} />
                    {s.label}
                  </span>
                ))}
              </div>
            </article>

            <article className="panel deal-card">
              <h2>Activity mix</h2>
              <p>Enrollments and payments within the selected period</p>
              <div className="deal-bar">
                <i style={{ width: `${(enrollTotal / dealTotal) * 100}%` }} title={`Enrollments: ${enrollTotal}`} />
                <b style={{ width: `${(payTotal / dealTotal) * 100}%` }} title={`Payments: ${payTotal}`} />
              </div>
              <div className="deal-numbers">
                <div>
                  <strong className="blue">
                    Enrollments <small>(Students)</small>
                  </strong>
                  <b>{enrollTotal}</b>
                  <span>{((enrollTotal / dealTotal) * 100).toFixed(1)}%</span>
                </div>
                <div>
                  <strong className="purple">
                    Payments <small>(Finance)</small>
                  </strong>
                  <b>{payTotal}</b>
                  <span>{((payTotal / dealTotal) * 100).toFixed(1)}%</span>
                </div>
              </div>
              <div className="deal-footer">
                <b>
                  Success {completedPayments} · {successRate}%
                </b>
                <span>Interactions {dash.interactions ?? 0}</span>
              </div>
              <small style={{ color: 'var(--muted)', fontSize: 10 }}>
                Success uses completed payments in the selected filters.
              </small>
            </article>
          </section>

          <CityMap
            locations={locations}
            selected={filters.city}
            onSelect={(city) => setFilters((f) => ({ ...f, city }))}
          />

          <section className="mid-grid lower-grid">
            <article className="panel channel-card">
              <h2>Status by payment method</h2>
              <p>Each bar shows payment statuses for the method</p>
              {channels.length ? (
                channels.map((c) => (
                  <div key={c.name} className="channel-row">
                    <span className="channel-name">{c.name}</span>
                    <div className="stack">
                      {(Array.isArray(c.values) ? c.values : []).map((v, i) => (
                        <i
                          key={i}
                          className={`seg ${['green-bg', 'gold-bg', 'purple-bg', 'gray-bg', 'blue-bg'][i]}`}
                          style={{ width: `${c.total ? (v / c.total) * 100 : 0}%` }}
                          title={`${c.name}: ${v}`}
                        />
                      ))}
                    </div>
                    <b>{c.total}</b>
                    <span className="success-rate">{c.success}%</span>
                  </div>
                ))
              ) : (
                <div className="empty-state">No payment method data for this period.</div>
              )}
              <div className="legend">
                {['Completed', 'Pending', 'Failed', 'Refunded', 'Voided'].map((label, i) => (
                  <span key={label}>
                    <i className={['green-bg', 'gold-bg', 'purple-bg', 'gray-bg', 'blue-bg'][i]} />
                    {label}
                  </span>
                ))}
              </div>
            </article>

            <article className="panel vehicle-card">
              <h2>Courses recorded</h2>
              <p>Course catalog volume in the institute</p>
              {vehicles.length ? (
                vehicles.map((v) => (
                  <div key={v.name} className="vehicle-row">
                    <span className="vehicle-label">{v.name}</span>
                    <div>
                      <i
                        style={{
                          width: `${(v.total / (vehicles[0]?.total || 1)) * 100}%`,
                        }}
                      />
                    </div>
                    <b>{v.total}</b>
                  </div>
                ))
              ) : (
                <div className="empty-state">No course details recorded.</div>
              )}
            </article>
          </section>

          <section className="panel table-card">
            <h2>Status by activity type</h2>
            <p>Current status of enrollments and payments. Expand a row to see subcategories.</p>
            <div className="overflow">
              <table>
                <thead>
                  <tr>
                    <th>Type / Subcategory</th>
                    <th>Total</th>
                    <th>A</th>
                    <th>B</th>
                    <th>C</th>
                    <th>D</th>
                    <th>E</th>
                    <th>Success %</th>
                  </tr>
                </thead>
                <tbody>
                  {deals.map((r) => (
                    <React.Fragment key={r.name}>
                      <tr>
                        <td className={r.name === 'Enrollments' ? 'blue' : 'purple'}>
                          {r.subcategories?.length ? (
                            <button
                              type="button"
                              className="deal-row-toggle"
                              aria-expanded={!!expandedDealRows[r.name]}
                              onClick={() =>
                                setExpandedDealRows((prev) => ({
                                  ...prev,
                                  [r.name]: !prev[r.name],
                                }))
                              }
                            >
                              <span aria-hidden="true">{expandedDealRows[r.name] ? '▾' : '▸'}</span>
                              <b>{r.name}</b>
                            </button>
                          ) : (
                            <b>{r.name}</b>
                          )}
                        </td>
                        <td>
                          <b>{r.total}</b>
                        </td>
                        {(Array.isArray(r.values) ? r.values : []).map((v, i) => (
                          <td key={`${r.name}-${i}`}>{v}</td>
                        ))}
                        <td className="align-right">{r.rate}%</td>
                      </tr>
                      {expandedDealRows[r.name] &&
                        (r.subcategories || []).map((category) => (
                          <tr key={`${r.name}-${category.key}`}>
                            <td style={{ paddingLeft: 30, color: 'var(--muted)' }}>{category.key}</td>
                            <td>
                              <b>{category.total}</b>
                            </td>
                            {(Array.isArray(category.values) ? category.values : []).map((v, i) => (
                              <td key={`${r.name}-${category.key}-${i}`}>{v}</td>
                            ))}
                            <td className="align-right">{category.rate}%</td>
                          </tr>
                        ))}
                    </React.Fragment>
                  ))}
                  {!deals.length && (
                    <tr>
                      <td colSpan={8} className="empty-state">
                        No activity for this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel attention-card">
            <div className="attention-heading">
              <div>
                <h2>Needs Attention&nbsp; {dash.attention_total || 0}</h2>
                <p>Pending/failed payments and inactive students requiring follow-up</p>
              </div>
              <Link href="/payments" className="link-btn">
                View all payments →
              </Link>
            </div>
            <div className="overflow">
              <table>
                <thead>
                  <tr>
                    <th>Record</th>
                    <th>Contact</th>
                    <th>Method / Email</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Detail</th>
                    <th>Last date</th>
                    <th className="align-right">Age</th>
                  </tr>
                </thead>
                <tbody>
                  {attention.map((item) => (
                    <tr key={item.id}>
                      <td>{item.customer}</td>
                      <td>{item.contact_number || '—'}</td>
                      <td>{item.method || '—'}</td>
                      <td>{item.deal || '—'}</td>
                      <td>
                        <span className={statusChipClass(item.status)}>{item.status.replace('_', ' ')}</span>
                      </td>
                      <td>{item.vehicle || '—'}</td>
                      <td>{item.last || '—'}</td>
                      <td className="align-right gold">{item.days ?? '—'} days</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!attention.length && <div className="empty-state">No items need attention for these filters.</div>}
            </div>
          </section>

          <footer className="dash-footer">
            <span>Figures reflect saved EMIS institute records{filters.city ? ` for ${filters.city}` : ''}.</span>
            <span>Snapshot: {snapshot} Kabul time</span>
          </footer>
        </>
      )}
    </main>
  );
}
