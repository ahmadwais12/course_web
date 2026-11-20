'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, FileSpreadsheet, FileText, Loader2, Printer } from 'lucide-react';
import {
  DataTable,
  Dropdown,
  ErrorBanner,
  Filter,
  PageHeader,
  PortButton,
  SectionPanel,
} from '@/components/ports';
import type { FilterField, SelectOption } from '@/components/ports';
import { useListQuery } from '@/hooks/useListQuery';
import { SESSION_STATUSES, VERIFY_RESULTS } from '@/lib/verification';
import { VerificationTabs } from './shared';

type ReportType = 'branch' | 'missing' | 'wrong_location' | 'condition' | 'unregistered' | 'history';

const REPORT_TYPES: { value: ReportType; label: string; description: string }[] = [
  { value: 'branch', label: 'Branch physical verification', description: 'Session outcomes per branch and campaign.' },
  { value: 'missing', label: 'Missing assets', description: 'Expected assets recorded as not found.' },
  { value: 'wrong_location', label: 'Wrong location', description: 'Assets found outside the expected branch, department, or location.' },
  { value: 'condition', label: 'Asset condition', description: 'Physical condition recorded by officers.' },
  { value: 'unregistered', label: 'Unregistered assets', description: 'Discovered assets pending or approved for registration.' },
  { value: 'history', label: 'Verification history', description: 'Full audit trail of verification results.' },
];

type ReportData = {
  type: ReportType;
  title: string;
  columns: { header: string; key: string; align?: 'left' | 'right' | 'center' }[];
  rows: Record<string, string | number>[];
};

type Options = {
  campaigns: SelectOption[];
  branches: SelectOption[];
  countries: SelectOption[];
  departments: SelectOption[];
  categories: SelectOption[];
  officers: SelectOption[];
};

export default function VerificationReportsPage() {
  const [type, setType] = useState<ReportType>('branch');
  const [options, setOptions] = useState<Options | null>(null);
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [campaignId, setCampaignId] = useState('');
  const [branch, setBranch] = useState('');
  const [country, setCountry] = useState('');
  const [department, setDepartment] = useState('');
  const [category, setCategory] = useState('');
  const [officer, setOfficer] = useState('');
  const [result, setResult] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    fetch('/api/inventory/verification/options', { cache: 'no-store' })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || 'Failed to load report options');
        setOptions({
          campaigns: body.campaigns ?? [],
          branches: body.branches ?? [],
          countries: body.countries ?? [],
          departments: body.departments ?? [],
          categories: body.categories ?? [],
          officers: body.officers ?? [],
        });
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load report options'));
  }, []);

  const params = useCallback(() => {
    const search = new URLSearchParams({ type });
    if (campaignId) search.set('campaign_id', campaignId);
    if (branch) search.set('branch', branch);
    if (country) search.set('country', country);
    if (department) search.set('department', department);
    if (category) search.set('category', category);
    if (officer) search.set('officer_id', officer);
    if (result) search.set('result', result);
    if (status) search.set('status', status);
    if (from) search.set('from', from);
    if (to) search.set('to', to);
    return search;
  }, [type, campaignId, branch, country, department, category, officer, result, status, from, to]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/inventory/verification/reports?${params().toString()}`, { cache: 'no-store' });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to build the report');
      setReport(body as ReportData);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to build the report');
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    void load();
  }, [load]);

  const filterFields = useMemo<FilterField[]>(
    () => [
      { key: 'campaign', label: 'Campaign', value: campaignId, options: options?.campaigns ?? [], onChange: setCampaignId, placeholder: 'All campaigns' },
      { key: 'branch', label: 'Branch', value: branch, options: options?.branches ?? [], onChange: setBranch, placeholder: 'All branches' },
      { key: 'country', label: 'Country', value: country, options: options?.countries ?? [], onChange: setCountry, placeholder: 'All countries' },
      { key: 'department', label: 'Department', value: department, options: options?.departments ?? [], onChange: setDepartment, placeholder: 'All departments' },
      { key: 'category', label: 'Category', value: category, options: options?.categories ?? [], onChange: setCategory, placeholder: 'All categories' },
      { key: 'officer', label: 'Officer', value: officer, options: options?.officers ?? [], onChange: setOfficer, placeholder: 'All officers' },
      { key: 'result', label: 'Result', value: result, options: VERIFY_RESULTS.map((row) => ({ value: row.value, label: row.label })), onChange: setResult, placeholder: 'All results' },
      { key: 'status', label: 'Session status', value: status, options: SESSION_STATUSES.map((row) => ({ value: row.value, label: row.label })), onChange: setStatus, placeholder: 'All statuses' },
    ],
    [campaignId, branch, country, department, category, officer, result, status, options]
  );

  const rows = useMemo(
    () => (report?.rows ?? []).map((row, index) => ({ ...row, __key: String(index) })),
    [report]
  );

  const query = useListQuery({
    items: rows as (Record<string, string | number> & Record<string, unknown>)[],
    searchKeys: report?.columns.map((column) => column.key) ?? [],
    filterKey: report?.type ?? '',
    initialPerPage: 25,
  });

  const exportUrl = (format: 'xlsx' | 'csv') => {
    const search = params();
    search.set('format', format);
    return `/api/inventory/verification/reports/export?${search.toString()}`;
  };

  return (
    <div className="min-w-0 space-y-4 animate-fade-up">
      <PageHeader
        title="Verification reports"
        description="Audit-ready verification outputs. Filter by campaign, branch, officer, result, and dates."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={exportUrl('xlsx')}
              className="inline-flex h-10 items-center gap-2 rounded-[7px] border border-border bg-card px-4 text-sm font-semibold shadow-sm hover:bg-muted"
            >
              <FileSpreadsheet size={15} /> Excel
            </a>
            <a
              href={exportUrl('csv')}
              className="inline-flex h-10 items-center gap-2 rounded-[7px] border border-border bg-card px-4 text-sm font-semibold shadow-sm hover:bg-muted"
            >
              <Download size={15} /> CSV
            </a>
            <PortButton variant="secondary" onClick={() => window.print()}>
              <Printer size={15} /> PDF / Print
            </PortButton>
          </div>
        }
      />
      <VerificationTabs />
      {error && <ErrorBanner message={error} />}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {REPORT_TYPES.map((entry) => {
          const active = entry.value === type;
          return (
            <button
              key={entry.value}
              type="button"
              onClick={() => setType(entry.value)}
              className={`rounded-xl border px-4 py-3 text-start transition ${
                active
                  ? 'border-[#88b6ff] bg-[#88b6ff]/10'
                  : 'border-border bg-card hover:border-[#88b6ff]/60'
              }`}
            >
              <p className="text-sm font-semibold">{entry.label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{entry.description}</p>
            </button>
          );
        })}
      </div>

      <Filter
        search={query.search}
        onSearchChange={query.setSearch}
        searchPlaceholder="Search within the report…"
        filters={filterFields}
        dateFrom={from}
        dateTo={to}
        onDateRangeChange={({ from: nextFrom, to: nextTo }) => {
          setFrom(nextFrom);
          setTo(nextTo);
        }}
        onReset={() => {
          setCampaignId('');
          setBranch('');
          setCountry('');
          setDepartment('');
          setCategory('');
          setOfficer('');
          setResult('');
          setStatus('');
          setFrom('');
          setTo('');
          query.reset();
        }}
        title="Report filters"
        description="Filters combine with the selected report type."
      />

      <SectionPanel
        title={report?.title ?? 'Report'}
        description={loading ? 'Generating from live verification data…' : `${report?.rows.length ?? 0} row(s)`}
        headerRight={
          loading ? <Loader2 size={16} className="animate-spin text-muted-foreground" /> : <FileText size={16} className="text-muted-foreground" />
        }
        bodyClassName="pt-2"
      >
        <DataTable
          columns={(report?.columns ?? []).map((column) => ({
            key: column.key,
            header: column.header,
            align: column.align,
            render: (row: Record<string, string | number>) => String(row[column.key] ?? ''),
          }))}
          rows={query.rows}
          rowKey={(row) => String(row.__key)}
          loading={loading}
          emptyMessage="No rows match the selected report and filters."
          page={query.page}
          perPage={query.perPage}
          total={query.total}
          onPageChange={query.setPage}
          onPerPageChange={query.setPerPage}
        />
      </SectionPanel>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Dropdown
          value=""
          onChange={(value) => {
            if (value) window.location.href = exportUrl(value as 'xlsx' | 'csv');
          }}
          options={[
            { value: 'xlsx', label: 'Download Excel (.xlsx)' },
            { value: 'csv', label: 'Download CSV' },
          ]}
          placeholder="Export report…"
          className="w-56"
        />
        <span>Exports use the current report type and filters. Use Print for a PDF copy.</span>
      </div>
    </div>
  );
}
