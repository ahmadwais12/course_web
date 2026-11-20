'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ClipboardCheck } from 'lucide-react';
import {
  ErrorBanner,
  ListPageShell,
  StatusChip,
  statusToneFromValue,
} from '@/components/ports';
import type { FilterField } from '@/components/ports';
import { useListQuery } from '@/hooks/useListQuery';
import { SESSION_STATUSES, labelFrom } from '@/lib/verification';
import { ProgressBar, VerificationTabs, shortDate } from './shared';

type Session = {
  id: string;
  code: string;
  campaign_id: string;
  campaign_name: string;
  campaign_code: string;
  branch_name: string;
  country: string;
  province: string;
  officer_name: string;
  status: string;
  due_at: string;
  started_at: string | null;
  submitted_at: string | null;
  total: number;
  verified: number;
  pending: number;
  completion: number;
  discrepancies_open: number;
  created_at: string;
};

type CampaignOption = { id: string; code: string; name: string };

export default function VerificationSessionsPage({ initialCampaignId = '' }: { initialCampaignId?: string }) {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [campaignFilter, setCampaignFilter] = useState(initialCampaignId);
  const [statusFilter, setStatusFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sessionRes, campaignRes] = await Promise.all([
        fetch('/api/inventory/verification/sessions', { cache: 'no-store' }),
        fetch('/api/inventory/verification/campaigns', { cache: 'no-store' }),
      ]);
      const sessionBody = await sessionRes.json();
      if (!sessionRes.ok) throw new Error(sessionBody.error || 'Failed to load sessions');
      const campaignBody = await campaignRes.json();
      if (!campaignRes.ok) throw new Error(campaignBody.error || 'Failed to load campaigns');
      setSessions(sessionBody as Session[]);
      setCampaigns(
        (campaignBody as { id: string; code: string; name: string }[]).map((row) => ({
          id: row.id,
          code: row.code,
          name: row.name,
        }))
      );
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filterFields = useMemo<FilterField[]>(
    () => [
      {
        key: 'campaign',
        label: 'Campaign',
        value: campaignFilter,
        options: campaigns.map((row) => ({ value: row.id, label: `${row.code} — ${row.name}` })),
        onChange: setCampaignFilter,
        placeholder: 'All campaigns',
      },
      {
        key: 'status',
        label: 'Session status',
        value: statusFilter,
        options: SESSION_STATUSES.map((row) => ({ value: row.value, label: row.label })),
        onChange: setStatusFilter,
        placeholder: 'All statuses',
      },
    ],
    [campaignFilter, statusFilter, campaigns]
  );

  const filtered = useMemo(
    () =>
      sessions.filter((session) => {
        if (campaignFilter && session.campaign_id !== campaignFilter) return false;
        if (statusFilter && session.status !== statusFilter) return false;
        return true;
      }),
    [sessions, campaignFilter, statusFilter]
  );

  const query = useListQuery({
    items: filtered as unknown as (Session & Record<string, unknown>)[],
    searchKeys: ['code', 'campaign_name', 'branch_name', 'officer_name'],
    filterKey: `${campaignFilter}|${statusFilter}`,
  });

  return (
    <ListPageShell
      title="Verification sessions"
      description="Each campaign generates one session per branch. Open a session to inspect assets and record results."
      search={query.search}
      onSearchChange={query.setSearch}
      searchPlaceholder="Search by session code, branch, campaign, or officer…"
      filters={filterFields}
      onResetFilters={() => {
        setCampaignFilter('');
        setStatusFilter('');
        query.reset();
      }}
      columns={[
        {
          key: 'session',
          header: 'Session',
          render: (row) => (
            <div>
              <div className="font-semibold">{row.code}</div>
              <div className="text-xs text-muted-foreground">
                {row.campaign_code} · {row.campaign_name}
              </div>
            </div>
          ),
        },
        {
          key: 'branch',
          header: 'Branch',
          render: (row) => (
            <div>
              <div className="font-medium">{row.branch_name}</div>
              <div className="text-xs text-muted-foreground">
                {[row.province, row.country].filter(Boolean).join(', ') || '—'}
              </div>
            </div>
          ),
        },
        { key: 'officer', header: 'Officer', render: (row) => row.officer_name || 'Unassigned' },
        {
          key: 'status',
          header: 'Status',
          render: (row) => (
            <StatusChip label={labelFrom(SESSION_STATUSES, row.status, row.status)} tone={statusToneFromValue(row.status)} />
          ),
        },
        { key: 'expected', header: 'Expected', align: 'right', render: (row) => row.total },
        { key: 'verified', header: 'Verified', align: 'right', render: (row) => row.verified },
        { key: 'pending', header: 'Pending', align: 'right', render: (row) => row.pending },
        {
          key: 'completion',
          header: 'Completion',
          render: (row) => <ProgressBar value={row.completion} />,
        },
        { key: 'discrepancies', header: 'Open issues', align: 'right', render: (row) => row.discrepancies_open },
        { key: 'due', header: 'Due', render: (row) => shortDate(row.due_at) },
        {
          key: 'actions',
          header: '',
          align: 'right',
          render: (row) => (
            <button
              type="button"
              onClick={() => router.push(`/inventory/verification/sessions/${row.id}`)}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[7px] bg-[#88b6ff] px-3 text-xs font-semibold text-[#142033] hover:opacity-90"
            >
              <ClipboardCheck size={14} /> Workspace <ArrowRight size={13} />
            </button>
          ),
        },
      ]}
      rows={query.rows as unknown as Session[]}
      rowKey={(row) => row.id}
      loading={loading}
      emptyMessage="No sessions match these filters."
      page={query.page}
      perPage={query.perPage}
      total={query.total}
      onPageChange={query.setPage}
      onPerPageChange={query.setPerPage}
    >
      <VerificationTabs />
      {error && <ErrorBanner message={error} />}
    </ListPageShell>
  );
}
