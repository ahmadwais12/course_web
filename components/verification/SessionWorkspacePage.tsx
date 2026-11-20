'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  ChevronRight,
  FileText,
  Loader2,
  PlusCircle,
  RotateCcw,
  SearchX,
  Send,
  XCircle,
} from 'lucide-react';
import {
  ConfirmDialog,
  DataTable,
  Dropdown,
  ErrorBanner,
  Filter,
  FormDialog,
  InputField,
  PageHeader,
  PortButton,
  SearchBar,
  SectionPanel,
  SegmentedControl,
  StatCard,
  StatusChip,
  TextAreaField,
  statusToneFromValue,
} from '@/components/ports';
import type { FilterField, SelectOption } from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import { useListQuery } from '@/hooks/useListQuery';
import {
  CAMPAIGN_PRIORITIES,
  CAMPAIGN_TYPES,
  PHYSICAL_CONDITIONS,
  SESSION_STATUSES,
  VERIFY_RESULTS,
  labelFrom,
} from '@/lib/verification';
import CodeScanner from './CodeScanner';
import VerificationItemDialog, { type VerificationItemRow } from './VerificationItemDialog';
import { ProgressBar, VerificationTabs, shortDate, timestamp } from './shared';

type SessionRow = {
  id: string;
  code: string;
  campaign_id: string;
  campaign_name: string;
  campaign_code: string;
  branch_name: string;
  country: string;
  province: string;
  officer_id: string;
  officer_name: string;
  status: string;
  due_at: string;
  started_at: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  completed_at: string | null;
  total: number;
  verified: number;
  pending: number;
  completion: number;
};

type Campaign = {
  id: string;
  code: string;
  name: string;
  type: string;
  priority: string;
  start_date: string;
  due_date: string;
  scope_type: string;
  scope_values: string[];
  instructions: string;
  attachments: string[];
  status: string;
};

type Discrepancy = {
  id: string;
  code: string;
  asset_code: string;
  asset_name: string;
  type: string;
  status: string;
  priority: string;
  reported_by_name: string;
  reported_at: string;
};

type Discovery = {
  id: string;
  code: string;
  asset_name: string;
  category_name: string;
  serial_number: string;
  location: string;
  condition: string;
  status: string;
  discovered_by_name: string;
  discovered_at: string;
};

type Evidence = {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  uploaded_by_name: string;
  created_at: string;
  url: string;
  verification_item_id: string | null;
  discrepancy_id: string | null;
};

type Activity = {
  id: string;
  action: string;
  detail: string;
  actor_name: string;
  created_at: string;
};

type SessionData = {
  session: SessionRow;
  campaign: Campaign | null;
  items: VerificationItemRow[];
  discrepancies: Discrepancy[];
  discoveries: Discovery[];
  evidence: Evidence[];
  activity: Activity[];
  settings: { allow_submit_with_pending: boolean; require_evidence_for_discrepancy: boolean };
};

type Options = {
  me: { id: string; name: string; manager: boolean };
  departments: SelectOption[];
  locations: SelectOption[];
  categories: SelectOption[];
  provinces: SelectOption[];
  branches: { id: string; name: string; country: string; province: string }[];
};

type DiscoveryDraft = {
  asset_name: string;
  category_id: string;
  category_name: string;
  serial_number: string;
  manufacturer: string;
  model: string;
  department: string;
  location: string;
  province: string;
  condition: string;
  estimated_value: string;
  description: string;
};

const EMPTY_DISCOVERY: DiscoveryDraft = {
  asset_name: '',
  category_id: '',
  category_name: '',
  serial_number: '',
  manufacturer: '',
  model: '',
  department: '',
  location: '',
  province: '',
  condition: '',
  estimated_value: '',
  description: '',
};

const TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'assets', label: 'Asset list' },
  { value: 'discrepancies', label: 'Discrepancies' },
  { value: 'discoveries', label: 'Discoveries' },
  { value: 'evidence', label: 'Evidence' },
  { value: 'activity', label: 'Activity' },
];

function resultTone(result: string) {
  if (result === 'found') return 'green' as const;
  if (result === 'not_found') return 'purple' as const;
  if (result === 'wrong_location' || result === 'damaged') return 'gold' as const;
  return 'gray' as const;
}

export default function SessionWorkspacePage({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [data, setData] = useState<SessionData | null>(null);
  const [options, setOptions] = useState<Options | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState('overview');
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<'submit' | 'cancel' | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewNote, setReviewNote] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [resultFilter, setResultFilter] = useState('');
  const [verifyItem, setVerifyItem] = useState<VerificationItemRow | null>(null);
  const [verifyMethod, setVerifyMethod] = useState('manual');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [discoveryOpen, setDiscoveryOpen] = useState(false);
  const [discovery, setDiscovery] = useState<DiscoveryDraft>(EMPTY_DISCOVERY);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);
  const [savingDiscovery, setSavingDiscovery] = useState(false);

  const load = useCallback(async () => {
    try {
      const [sessionRes, optionsRes] = await Promise.all([
        fetch(`/api/inventory/verification/sessions/${sessionId}`, { cache: 'no-store' }),
        fetch('/api/inventory/verification/options', { cache: 'no-store' }),
      ]);
      const sessionBody = await sessionRes.json();
      if (!sessionRes.ok) throw new Error(sessionBody.error || 'Failed to load the session');
      const optionsBody = await optionsRes.json();
      if (!optionsRes.ok) throw new Error(optionsBody.error || 'Failed to load verification options');
      setData(sessionBody as SessionData);
      setOptions(optionsBody as Options);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load the session');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const items = data?.items ?? [];
  const session = data?.session;
  const me = options?.me;
  const closed = session ? ['submitted', 'under_review', 'completed', 'cancelled'].includes(session.status) : true;

  const filterFields = useMemo<FilterField[]>(
    () => [
      {
        key: 'department',
        label: 'Department',
        value: deptFilter,
        options: options?.departments ?? [],
        onChange: setDeptFilter,
        placeholder: 'All departments',
      },
      {
        key: 'location',
        label: 'Location',
        value: locationFilter,
        options: options?.locations ?? [],
        onChange: setLocationFilter,
        placeholder: 'All locations',
      },
      {
        key: 'category',
        label: 'Category',
        value: categoryFilter,
        options: options?.categories ?? [],
        onChange: setCategoryFilter,
        placeholder: 'All categories',
      },
      {
        key: 'result',
        label: 'Verification result',
        value: resultFilter,
        options: VERIFY_RESULTS.map((row) => ({ value: row.value, label: row.label })),
        onChange: setResultFilter,
        placeholder: 'All results',
      },
    ],
    [deptFilter, locationFilter, categoryFilter, resultFilter, options]
  );

  const filterFn = useCallback(
    (item: VerificationItemRow) => {
      if (deptFilter && item.expected_department !== deptFilter) return false;
      if (locationFilter && item.expected_location !== locationFilter) return false;
      if (categoryFilter && item.category !== categoryFilter) return false;
      if (resultFilter && item.result !== resultFilter) return false;
      return true;
    },
    [deptFilter, locationFilter, categoryFilter, resultFilter]
  );

  const query = useListQuery({
    items: items as unknown as (VerificationItemRow & Record<string, unknown>)[],
    searchKeys: ['asset_code', 'asset_name', 'serial_number'],
    filterFn: filterFn as (item: VerificationItemRow & Record<string, unknown>) => boolean,
    filterKey: `${deptFilter}|${locationFilter}|${categoryFilter}|${resultFilter}`,
    initialPerPage: 25,
  });

  const filteredItems = query.filtered as unknown as VerificationItemRow[];

  const nextPending = (current: VerificationItemRow) => {
    const index = filteredItems.findIndex((row) => row.id === current.id);
    const after = filteredItems.slice(index + 1).find((row) => row.result === 'pending');
    return after ?? filteredItems.find((row) => row.result === 'pending' && row.id !== current.id) ?? null;
  };

  const openVerify = (item: VerificationItemRow, method = 'manual') => {
    setVerifyMethod(method);
    setVerifyItem(item);
  };

  const handleScan = (value: string) => {
    setScannerOpen(false);
    const needle = value.trim().toLowerCase();
    const match = items.find(
      (item) =>
        item.asset_code.toLowerCase() === needle ||
        item.serial_number.toLowerCase() === needle
    );
    if (!match) {
      toast.info(`No expected asset matches “${value}”. Record it as an unregistered discovery if it exists.`);
      return;
    }
    openVerify(match, 'qr_scan');
  };

  const act = async (action: 'start' | 'submit' | 'approve' | 'reject' | 'cancel', note = '') => {
    setBusy(action);
    try {
      const res = await fetch(`/api/inventory/verification/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, note }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Could not update the session');
      toast.success(
        action === 'start'
          ? 'Session started'
          : action === 'submit'
            ? 'Session submitted for head office review'
            : action === 'approve'
              ? 'Session approved and completed'
              : action === 'reject'
                ? 'Session returned for corrections'
                : 'Session cancelled'
      );
      setReviewOpen(false);
      setReviewNote('');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update the session');
    } finally {
      setBusy(null);
    }
  };

  const discoveryAct = async (id: string, action: 'review' | 'approve' | 'reject' | 'register') => {
    setBusy(`discovery:${id}:${action}`);
    try {
      const res = await fetch(`/api/inventory/verification/discoveries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Could not update the discovery');
      toast.success(
        action === 'register'
          ? 'Discovery registered as an official asset'
          : `Discovery ${action === 'review' ? 'moved under review' : action === 'approve' ? 'approved' : 'rejected'}`
      );
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update the discovery');
    } finally {
      setBusy(null);
    }
  };

  const saveDiscovery = async () => {
    setSavingDiscovery(true);
    setDiscoveryError(null);
    try {
      const res = await fetch(`/api/inventory/verification/sessions/${sessionId}/discoveries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...discovery,
          estimated_value: discovery.estimated_value ? Number(discovery.estimated_value) : null,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Could not record the discovery');
      toast.success('Unregistered asset submitted for head office review');
      setDiscoveryOpen(false);
      setDiscovery(EMPTY_DISCOVERY);
      await load();
      setTab('discoveries');
    } catch (e) {
      setDiscoveryError(e instanceof Error ? e.message : 'Could not record the discovery');
    } finally {
      setSavingDiscovery(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 size={22} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data || !session) {
    return (
      <div className="space-y-4">
        <VerificationTabs />
        <ErrorBanner message={error ?? 'Verification session not found.'} />
        <PortButton onClick={() => router.push('/inventory/verification/sessions')}>Back to sessions</PortButton>
      </div>
    );
  }

  const notFound = items.filter((row) => row.result === 'not_found').length;
  const wrongLocation = items.filter((row) => row.result === 'wrong_location').length;
  const found = items.filter((row) => ['found', 'damaged', 'inactive'].includes(row.result)).length;

  return (
    <div className="min-w-0 space-y-4 animate-fade-up">
      <button
        type="button"
        onClick={() => router.push('/inventory/verification/sessions')}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={14} /> All sessions
      </button>

      <PageHeader
        title={`${session.branch_name} · ${session.code}`}
        description={`${session.campaign_code} — ${session.campaign_name}. Officer: ${session.officer_name || 'Unassigned'}. Due ${shortDate(session.due_at)}.`}
        pill={labelFrom(SESSION_STATUSES, session.status, session.status).toUpperCase()}
        pillTone={session.status === 'in_progress' ? 'live' : 'neutral'}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {session.status === 'draft' || session.status === 'assigned' ? (
              <PortButton variant="primary" onClick={() => void act('start')} disabled={busy !== null}>
                Start session
              </PortButton>
            ) : null}
            {session.status === 'in_progress' ? (
              <PortButton variant="secondary" onClick={() => setConfirmAction('submit')} disabled={busy !== null}>
                <Send size={15} /> Submit session
              </PortButton>
            ) : null}
            {me?.manager && ['submitted', 'under_review'].includes(session.status) ? (
              <PortButton variant="primary" onClick={() => setReviewOpen(true)}>
                Review session
              </PortButton>
            ) : null}
            {me?.manager && !['completed', 'cancelled'].includes(session.status) ? (
              <PortButton variant="ghost" onClick={() => setConfirmAction('cancel')} disabled={busy !== null}>
                Cancel session
              </PortButton>
            ) : null}
          </div>
        }
      />
      <VerificationTabs />
      {error && <ErrorBanner message={error} />}

      <SectionPanel>
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <StatusChip label={labelFrom(SESSION_STATUSES, session.status, session.status)} tone={statusToneFromValue(session.status)} />
              <span>{[session.province, session.country].filter(Boolean).join(', ')}</span>
              <span>·</span>
              <span>
                Started {session.started_at ? timestamp(session.started_at) : '—'}
              </span>
            </div>
            <ProgressBar value={session.completion} />
            <p className="text-xs text-muted-foreground">
              {session.verified} of {session.total} expected assets verified · {session.pending} remaining
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <PortButton variant="secondary" onClick={() => setScannerOpen(true)} disabled={closed}>
              <Camera size={15} /> Scan code
            </PortButton>
            <PortButton variant="secondary" onClick={() => setDiscoveryOpen(true)} disabled={closed}>
              <PlusCircle size={15} /> Unregistered asset
            </PortButton>
          </div>
        </div>
      </SectionPanel>

      <SegmentedControl value={tab} onChange={setTab} options={TABS} />

      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Expected assets" value={session.total} hint="Snapshot when the session was created" accent="blue" />
            <StatCard label="Verified" value={session.verified} hint={found ? `${found} found physically` : 'No results yet'} accent="green" />
            <StatCard label="Not found" value={notFound} hint="Pending head office investigation" accent="gold" />
            <StatCard label="Wrong location" value={wrongLocation} hint="Found outside expected location" accent="purple" />
          </div>
          <SectionPanel title="Campaign context" description={data.campaign?.instructions || 'No extra instructions were provided.'}>
            <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
              <Detail label="Campaign" value={`${session.campaign_code} — ${session.campaign_name}`} />
              <Detail label="Type" value={data.campaign ? labelFrom(CAMPAIGN_TYPES, data.campaign.type) : '—'} />
              <Detail label="Priority" value={data.campaign ? labelFrom(CAMPAIGN_PRIORITIES, data.campaign.priority) : '—'} />
              <Detail
                label="Window"
                value={data.campaign ? `${shortDate(data.campaign.start_date)} → ${shortDate(data.campaign.due_date)}` : '—'}
              />
              <Detail
                label="Scope"
                value={
                  data.campaign
                    ? data.campaign.scope_type === 'all'
                      ? 'All inventoried assets'
                      : `${labelFrom(
                          [
                            { value: 'departments', label: 'Departments' },
                            { value: 'locations', label: 'Locations' },
                            { value: 'categories', label: 'Categories' },
                          ] as const,
                          data.campaign.scope_type,
                          data.campaign.scope_type
                        )}: ${data.campaign.scope_values.join(', ') || '—'}`
                    : '—'
                }
              />
              <Detail label="Officer" value={session.officer_name || 'Unassigned'} />
            </div>
            {data.campaign?.attachments?.length ? (
              <div className="flex flex-wrap gap-2 border-t border-border px-4 py-3">
                {data.campaign.attachments.map((url) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-medium hover:bg-muted"
                  >
                    <FileText size={13} /> Attachment
                  </a>
                ))}
              </div>
            ) : null}
          </SectionPanel>
          <SectionPanel title="Verification settings applied" description="Controlled by head office.">
            <ul className="grid gap-2 p-4 text-sm sm:grid-cols-2">
              <li className="rounded-lg border border-border px-3 py-2">
                Evidence required for discrepancy results:{' '}
                <strong>{data.settings.require_evidence_for_discrepancy ? 'Yes' : 'No'}</strong>
              </li>
              <li className="rounded-lg border border-border px-3 py-2">
                Submit with pending assets:{' '}
                <strong>{data.settings.allow_submit_with_pending ? 'Allowed' : 'Blocked'}</strong>
              </li>
            </ul>
          </SectionPanel>
        </div>
      )}

      {tab === 'assets' && (
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <SearchBar
              value={query.search}
              onChange={query.setSearch}
              placeholder="Search by asset code, name, or serial number…"
              className="sm:max-w-sm"
            />
            <Filter
              filters={filterFields}
              onReset={() => {
                setDeptFilter('');
                setLocationFilter('');
                setCategoryFilter('');
                setResultFilter('');
              }}
              title="Asset filters"
              description="Narrow the expected asset list by department, location, category, or result."
              className="sm:ml-auto"
            />
          </div>

          <SectionPanel
            title="Expected assets"
            description={
              closed
                ? 'This session is closed for verification. Results are read-only.'
                : 'Record a result for each expected asset. Results never change the official asset status.'
            }
            bodyClassName="pt-2"
          >
            <DataTable
              columns={[
                {
                  key: 'asset',
                  header: 'Asset',
                  render: (row) => (
                    <div>
                      <div className="font-semibold">{row.asset_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {row.asset_code}
                        {row.serial_number ? ` · SN ${row.serial_number}` : ''}
                      </div>
                    </div>
                  ),
                },
                { key: 'category', header: 'Category', render: (row) => row.category || '—' },
                {
                  key: 'expected',
                  header: 'Expected location',
                  render: (row) => (
                    <span className="text-xs text-muted-foreground">
                      {[row.expected_department, row.expected_location].filter(Boolean).join(' · ') || '—'}
                    </span>
                  ),
                },
                { key: 'holder', header: 'Custodian', render: (row) => row.holder_name || '—' },
                { key: 'status', header: 'Official status', render: (row) => row.expected_status || '—' },
                {
                  key: 'result',
                  header: 'Result',
                  render: (row) => (
                    <StatusChip
                      label={labelFrom(VERIFY_RESULTS, row.result, row.result)}
                      tone={resultTone(row.result)}
                    />
                  ),
                },
                {
                  key: 'verified',
                  header: 'Verified',
                  render: (row) =>
                    row.verified_at ? (
                      <div>
                        <div className="text-xs font-medium">{shortDate(row.verified_at)}</div>
                        <div className="text-[11px] text-muted-foreground">{row.verified_by_name}</div>
                      </div>
                    ) : (
                      '—'
                    ),
                },
                {
                  key: 'actions',
                  header: '',
                  align: 'right',
                  render: (row) => (
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        disabled={closed}
                        onClick={() => openVerify(row)}
                        className="inline-flex h-8 items-center gap-1 rounded-[7px] border border-border bg-card px-2.5 text-xs font-semibold shadow-sm hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
                      >
                        {row.result === 'pending' ? 'Verify' : 'Update'} <ChevronRight size={13} />
                      </button>
                    </div>
                  ),
                },
              ]}
              rows={query.rows as unknown as VerificationItemRow[]}
              rowKey={(row) => row.id}
              emptyMessage="No assets match the current filters."
              page={query.page}
              perPage={query.perPage}
              total={query.total}
              onPageChange={query.setPage}
              onPerPageChange={query.setPerPage}
            />
          </SectionPanel>
        </div>
      )}

      {tab === 'discrepancies' && (
        <SectionPanel title="Discrepancies" description="Raised automatically from discrepancy results. Head office investigates and corrects official records." bodyClassName="pt-2">
          <DataTable
            columns={[
              { key: 'code', header: 'ID', render: (row) => row.code },
              {
                key: 'asset',
                header: 'Asset',
                render: (row) => (
                  <div>
                    <div className="font-medium">{row.asset_name}</div>
                    <div className="text-xs text-muted-foreground">{row.asset_code}</div>
                  </div>
                ),
              },
              { key: 'type', header: 'Type', render: (row) => row.type.replace(/_/g, ' ') },
              {
                key: 'status',
                header: 'Status',
                render: (row) => (
                  <StatusChip label={row.status.replace(/_/g, ' ')} tone={statusToneFromValue(row.status)} />
                ),
              },
              { key: 'reporter', header: 'Reported by', render: (row) => `${row.reported_by_name} · ${shortDate(row.reported_at)}` },
              {
                key: 'actions',
                header: '',
                align: 'right',
                render: (row) => (
                  <PortButton variant="ghost" className="h-8 px-2 text-xs" onClick={() => router.push(`/inventory/verification/discrepancies/${row.id}`)}>
                    Open
                  </PortButton>
                ),
              },
            ]}
            rows={data.discrepancies}
            rowKey={(row) => row.id}
            emptyMessage="No discrepancies raised from this session."
          />
        </SectionPanel>
      )}

      {tab === 'discoveries' && (
        <SectionPanel
          title="Unregistered assets discovered"
          description="Submitted to head office for review. Assets are only registered after approval."
          headerRight={
            !closed ? (
              <PortButton variant="secondary" onClick={() => setDiscoveryOpen(true)}>
                <PlusCircle size={15} /> Record discovery
              </PortButton>
            ) : null
          }
          bodyClassName="pt-2"
        >
          <DataTable
            columns={[
              { key: 'code', header: 'ID', render: (row) => row.code },
              {
                key: 'asset',
                header: 'Asset',
                render: (row) => (
                  <div>
                    <div className="font-medium">{row.asset_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {[row.category_name, row.serial_number].filter(Boolean).join(' · ') || '—'}
                    </div>
                  </div>
                ),
              },
              { key: 'location', header: 'Found at', render: (row) => row.location || '—' },
              {
                key: 'condition',
                header: 'Condition',
                render: (row) => (row.condition ? labelFrom(PHYSICAL_CONDITIONS, row.condition, row.condition) : '—'),
              },
              {
                key: 'status',
                header: 'Status',
                render: (row) => (
                  <StatusChip label={row.status.replace(/_/g, ' ')} tone={statusToneFromValue(row.status)} />
                ),
              },
              { key: 'found', header: 'Discovered', render: (row) => `${row.discovered_by_name} · ${shortDate(row.discovered_at)}` },
              {
                key: 'actions',
                header: '',
                align: 'right',
                render: (row) => {
                  if (!me?.manager) return null;
                  const busyKey = (action: string) => busy === `discovery:${row.id}:${action}`;
                  return (
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      {['submitted', 'discovered'].includes(row.status) ? (
                        <button
                          type="button"
                          className="rounded-[7px] border border-border bg-card px-2 py-1 text-[11px] font-semibold hover:bg-muted"
                          disabled={busy !== null}
                          onClick={() => void discoveryAct(row.id, 'review')}
                        >
                          Review
                        </button>
                      ) : null}
                      {['submitted', 'discovered', 'under_review'].includes(row.status) ? (
                        <>
                          <button
                            type="button"
                            className="rounded-[7px] border border-border bg-card px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-muted dark:text-emerald-300"
                            disabled={busy !== null}
                            onClick={() => void discoveryAct(row.id, 'approve')}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="rounded-[7px] border border-border bg-card px-2 py-1 text-[11px] font-semibold text-destructive hover:bg-muted"
                            disabled={busy !== null}
                            onClick={() => void discoveryAct(row.id, 'reject')}
                          >
                            Reject
                          </button>
                        </>
                      ) : null}
                      {row.status === 'approved' ? (
                        <button
                          type="button"
                          className="rounded-[7px] bg-[#88b6ff] px-2 py-1 text-[11px] font-semibold text-[#142033] hover:opacity-90"
                          disabled={busy !== null}
                          onClick={() => void discoveryAct(row.id, 'register')}
                        >
                          {busyKey('register') ? 'Registering…' : 'Register asset'}
                        </button>
                      ) : null}
                    </div>
                  );
                },
              },
            ]}
            rows={data.discoveries}
            rowKey={(row) => row.id}
            emptyMessage="No unregistered assets recorded in this session."
          />
        </SectionPanel>
      )}

      {tab === 'evidence' && (
        <SectionPanel title="Evidence" description={`${data.evidence.length} file${data.evidence.length === 1 ? '' : 's'} uploaded to this session.`}>
          {data.evidence.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sm text-muted-foreground">
              <SearchX size={22} />
              No evidence uploaded yet.
            </div>
          ) : (
            <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.evidence.map((file) => (
                <a
                  key={file.id}
                  href={file.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group overflow-hidden rounded-xl border border-border bg-muted/20 hover:border-primary"
                >
                  {file.file_type.startsWith('image/') && file.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={file.url} alt={file.file_name} className="h-36 w-full object-cover" />
                  ) : (
                    <div className="flex h-36 items-center justify-center text-muted-foreground">
                      <FileText size={26} />
                    </div>
                  )}
                  <div className="px-3 py-2 text-xs">
                    <p className="truncate font-medium">{file.file_name}</p>
                    <p className="text-muted-foreground">
                      {file.uploaded_by_name} · {shortDate(file.created_at)}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </SectionPanel>
      )}

      {tab === 'activity' && (
        <SectionPanel title="Activity history" description="Every verification action is timestamped and attributed.">
          <ol className="divide-y divide-border">
            {data.activity.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-muted-foreground">No activity recorded.</li>
            ) : (
              data.activity.map((row) => (
                <li key={row.id} className="flex flex-wrap items-start justify-between gap-2 px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium">{row.action}</p>
                    <p className="text-xs text-muted-foreground">{row.detail}</p>
                  </div>
                  <div className="text-end text-xs text-muted-foreground">
                    <div>{row.actor_name}</div>
                    <div>{timestamp(row.created_at)}</div>
                  </div>
                </li>
              ))
            )}
          </ol>
        </SectionPanel>
      )}

      <VerificationItemDialog
        open={Boolean(verifyItem)}
        sessionId={sessionId}
        item={verifyItem}
        initialMethod={verifyMethod}
        allowNext={Boolean(verifyItem && verifyItem.result === 'pending')}
        onClose={() => setVerifyItem(null)}
        onSaved={load}
        onNext={() => {
          if (!verifyItem) return;
          const next = nextPending(verifyItem);
          setVerifyItem(next);
          if (!next) toast.info('No pending assets left in the current view.');
        }}
      />

      <CodeScanner open={scannerOpen} onClose={() => setScannerOpen(false)} onDetect={handleScan} />

      <ConfirmDialog
        open={Boolean(confirmAction)}
        title={confirmAction === 'submit' ? 'Submit session' : 'Cancel session'}
        message={
          confirmAction === 'submit'
            ? `Submit ${session.code} for head office review? Verification results become read-only after submission.${session.pending ? ` ${session.pending} asset${session.pending === 1 ? ' is' : 's are'} still pending.` : ''}`
            : `Cancel ${session.code}? This closes the session without completing verification.`
        }
        confirmLabel={confirmAction === 'submit' ? 'Submit' : 'Cancel session'}
        submitting={busy === confirmAction}
        onConfirm={() => {
          if (!confirmAction) return;
          const action = confirmAction;
          setConfirmAction(null);
          void act(action);
        }}
        onClose={() => setConfirmAction(null)}
      />

      <FormDialog
        open={reviewOpen}
        title={`Review ${session.code}`}
        onClose={() => setReviewOpen(false)}
        footer={
          <>
            <PortButton variant="ghost" type="button" onClick={() => setReviewOpen(false)} disabled={busy !== null}>
              Cancel
            </PortButton>
            <PortButton
              variant="secondary"
              type="button"
              disabled={busy !== null || !reviewNote.trim()}
              onClick={() => void act('reject', reviewNote)}
            >
              <RotateCcw size={15} /> Return for correction
            </PortButton>
            <PortButton variant="primary" type="button" disabled={busy !== null} onClick={() => void act('approve', reviewNote)}>
              <CheckCircle2 size={15} /> Approve &amp; complete
            </PortButton>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Approved by you as head office reviewer. Approving completes the session; returning it reopens verification for the
            officer with your note.
          </p>
          <TextAreaField
            label="Review note"
            value={reviewNote}
            onChange={(event) => setReviewNote(event.target.value)}
            placeholder="Required when returning for correction; optional on approval."
          />
          <p className="text-xs text-muted-foreground">
            {session.verified}/{session.total} verified · {data.discrepancies.length} discrepanc
            {data.discrepancies.length === 1 ? 'y' : 'ies'} · {data.discoveries.length} discover
            {data.discoveries.length === 1 ? 'y' : 'ies'}
          </p>
        </div>
      </FormDialog>

      <FormDialog
        open={discoveryOpen}
        title="Record unregistered asset"
        onClose={() => setDiscoveryOpen(false)}
        maxWidth="2xl"
        footer={
          <>
            <PortButton variant="ghost" type="button" onClick={() => setDiscoveryOpen(false)} disabled={savingDiscovery}>
              Cancel
            </PortButton>
            <PortButton variant="primary" type="button" onClick={() => void saveDiscovery()} disabled={savingDiscovery}>
              {savingDiscovery ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />} Submit discovery
            </PortButton>
          </>
        }
      >
        <div className="space-y-4">
          {discoveryError && <ErrorBanner message={discoveryError} />}
          <p className="text-xs text-muted-foreground">
            Discovered assets are submitted for head office approval. They never become official assets automatically.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <InputField
              label="Asset name"
              required
              value={discovery.asset_name}
              onChange={(event) => setDiscovery({ ...discovery, asset_name: event.target.value })}
              containerClassName="sm:col-span-2"
            />
            <Dropdown
              label="Category"
              value={discovery.category_id}
              onChange={(value) => {
                const category = options?.categories.find((row) => row.value === value);
                setDiscovery({ ...discovery, category_id: value, category_name: category?.label ?? '' });
              }}
              options={options?.categories ?? []}
              placeholder="Select category"
              clearable
            />
            <InputField
              label="Serial number"
              value={discovery.serial_number}
              onChange={(event) => setDiscovery({ ...discovery, serial_number: event.target.value })}
            />
            <InputField
              label="Manufacturer"
              value={discovery.manufacturer}
              onChange={(event) => setDiscovery({ ...discovery, manufacturer: event.target.value })}
            />
            <InputField
              label="Model"
              value={discovery.model}
              onChange={(event) => setDiscovery({ ...discovery, model: event.target.value })}
            />
            <InputField
              label="Department"
              value={discovery.department}
              onChange={(event) => setDiscovery({ ...discovery, department: event.target.value })}
            />
            <InputField
              label="Location"
              value={discovery.location}
              onChange={(event) => setDiscovery({ ...discovery, location: event.target.value })}
              placeholder="Room, floor, shelf…"
            />
            <InputField
              label="Province"
              value={discovery.province}
              onChange={(event) => setDiscovery({ ...discovery, province: event.target.value })}
              placeholder={session.province}
            />
            <Dropdown
              label="Condition"
              value={discovery.condition}
              onChange={(value) => setDiscovery({ ...discovery, condition: value })}
              options={PHYSICAL_CONDITIONS.map((row) => ({ value: row.value, label: row.label }))}
              placeholder="Select condition"
              clearable
            />
            <InputField
              label="Estimated value"
              type="number"
              min={0}
              step="0.01"
              value={discovery.estimated_value}
              onChange={(event) => setDiscovery({ ...discovery, estimated_value: event.target.value })}
              placeholder="0.00"
              className="num-ltr"
            />
            <div className="sm:col-span-2">
              <TextAreaField
                label="Description"
                value={discovery.description}
                onChange={(event) => setDiscovery({ ...discovery, description: event.target.value })}
                placeholder="How and where the asset was discovered, markings, and any other details."
              />
            </div>
          </div>
        </div>
      </FormDialog>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-border px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="truncate text-sm font-medium">{value || '—'}</p>
    </div>
  );
}
