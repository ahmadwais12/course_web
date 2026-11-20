'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Eye, Pencil, Play, Trash2 } from 'lucide-react';
import {
  ConfirmDialog,
  ErrorBanner,
  FormDialog,
  FormDialogFooter,
  ListPageShell,
  RowActions,
  StatusChip,
  statusToneFromValue,
} from '@/components/ports';
import { useListQuery } from '@/hooks/useListQuery';
import type { FilterField, RowActionItem } from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import {
  CAMPAIGN_STATUSES,
  CAMPAIGN_TYPES,
  labelFrom,
} from '@/lib/verification';
import CampaignForm, {
  EMPTY_CAMPAIGN,
  type CampaignDraft,
  type CampaignOptions,
  campaignPayload,
  draftFromCampaign,
} from './CampaignForm';
import { ProgressBar, VerificationTabs, shortDate } from './shared';

type Campaign = {
  id: string;
  code: string;
  name: string;
  description: string;
  type: string;
  start_date: string;
  due_date: string;
  priority: string;
  status: string;
  scope_type: string;
  branches: {
    branch_id: string;
    name: string;
    country: string;
    province: string;
    officer_id: string | null;
    officer_name: string;
    session_id: string | null;
  }[];
  session_count: number;
  expected_assets: number;
  verified_assets: number;
  pending_assets: number;
  completion: number;
  created_by_name: string;
  created_at: string;
};

export default function VerificationCampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [options, setOptions] = useState<CampaignOptions | null>(null);
  const [manager, setManager] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [draft, setDraft] = useState<CampaignDraft>(EMPTY_CAMPAIGN);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Campaign | null>(null);
  const [confirming, setConfirming] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [campaignRes, optionsRes] = await Promise.all([
        fetch('/api/inventory/verification/campaigns', { cache: 'no-store' }),
        fetch('/api/inventory/verification/options', { cache: 'no-store' }),
      ]);
      const campaignBody = await campaignRes.json();
      if (!campaignRes.ok) throw new Error(campaignBody.error || 'Failed to load campaigns');
      const optionsBody = await optionsRes.json();
      if (!optionsRes.ok) throw new Error(optionsBody.error || 'Failed to load campaign options');
      setCampaigns(campaignBody as Campaign[]);
      setOptions(optionsBody as CampaignOptions);
      setManager(Boolean((optionsBody as { me?: { manager?: boolean } }).me?.manager));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load campaigns');
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
        key: 'status',
        label: 'Campaign status',
        value: statusFilter,
        options: CAMPAIGN_STATUSES.map((row) => ({ value: row.value, label: row.label })),
        onChange: setStatusFilter,
        placeholder: 'All statuses',
      },
      {
        key: 'type',
        label: 'Campaign type',
        value: typeFilter,
        options: CAMPAIGN_TYPES.map((row) => ({ value: row.value, label: row.label })),
        onChange: setTypeFilter,
        placeholder: 'All types',
      },
    ],
    [statusFilter, typeFilter]
  );

  const filtered = useMemo(
    () =>
      campaigns.filter((campaign) => {
        if (statusFilter && campaign.status !== statusFilter) return false;
        if (typeFilter && campaign.type !== typeFilter) return false;
        return true;
      }),
    [campaigns, statusFilter, typeFilter]
  );

  const query = useListQuery({
    items: filtered as unknown as (Campaign & Record<string, unknown>)[],
    searchKeys: ['code', 'name', 'description'],
    filterKey: `${statusFilter}|${typeFilter}`,
  });

  const rows = query.rows as unknown as Campaign[];

  const openCreate = () => {
    setEditing(null);
    setDraft(EMPTY_CAMPAIGN);
    setFormError(null);
    setDialogOpen(true);
  };

  const openEdit = (campaign: Campaign) => {
    setEditing(campaign);
    setDraft(draftFromCampaign(campaign));
    setFormError(null);
    setDialogOpen(true);
  };

  const save = async () => {
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch(
        editing
          ? `/api/inventory/verification/campaigns/${editing.id}`
          : '/api/inventory/verification/campaigns',
        {
          method: editing ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(campaignPayload(draft)),
        }
      );
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Could not save the campaign');
      toast.success(editing ? 'Campaign updated' : 'Campaign created with branch sessions');
      setDialogOpen(false);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Could not save the campaign');
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (campaign: Campaign, status: string, label: string) => {
    setBusyId(campaign.id);
    try {
      const res = await fetch(`/api/inventory/verification/campaigns/${campaign.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Could not update the campaign');
      toast.success(`${campaign.code} ${label}`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update the campaign');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setConfirming(true);
    try {
      const res = await fetch(`/api/inventory/verification/campaigns/${deleting.id}`, {
        method: 'DELETE',
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Could not delete the campaign');
      toast.success('Campaign deleted');
      setDeleting(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not delete the campaign');
    } finally {
      setConfirming(false);
    }
  };

  const actionsFor = (campaign: Campaign): RowActionItem[] => {
    const items: RowActionItem[] = [
      {
        key: 'sessions',
        label: 'Open sessions',
        icon: <Eye size={16} />,
        onClick: () => router.push(`/inventory/verification/sessions?campaign_id=${campaign.id}`),
      },
    ];
    if (!manager) return items;
    items.push({
      key: 'edit',
      label: 'Edit campaign',
      icon: <Pencil size={16} />,
      onClick: () => openEdit(campaign),
      disabled: busyId === campaign.id,
    });
    if (campaign.status === 'draft') {
      items.push({
        key: 'start',
        label: 'Start campaign',
        icon: <Play size={16} />,
        onClick: () => void changeStatus(campaign, 'active', 'started'),
        disabled: busyId === campaign.id,
      });
    }
    if (campaign.status === 'active') {
      items.push({
        key: 'complete',
        label: 'Complete campaign',
        icon: <CheckCircle2 size={16} />,
        onClick: () => void changeStatus(campaign, 'completed', 'completed'),
        disabled: busyId === campaign.id,
      });
    }
    if (campaign.status === 'draft') {
      items.push({
        key: 'delete',
        label: 'Delete campaign',
        icon: <Trash2 size={16} />,
        danger: true,
        onClick: () => setDeleting(campaign),
      });
    }
    return items;
  };

  return (
    <>
      <ListPageShell
        title="Verification campaigns"
        description="Plan physical asset audits, assign branches and officers, and track completion."
        primaryAction={manager ? { label: 'New campaign', onClick: openCreate } : undefined}
        search={query.search}
        onSearchChange={query.setSearch}
        searchPlaceholder="Search by code, name, or description…"
        filters={filterFields}
        onResetFilters={() => {
          setStatusFilter('');
          setTypeFilter('');
          query.reset();
        }}
        columns={[
          {
            key: 'campaign',
            header: 'Campaign',
            render: (row) => (
              <div>
                <div className="font-semibold">{row.name}</div>
                <div className="text-xs text-muted-foreground">
                  {row.code} · {labelFrom(CAMPAIGN_TYPES, row.type)} ·{' '}
                  {row.branches.length} branch{row.branches.length === 1 ? '' : 'es'}
                </div>
              </div>
            ),
          },
          {
            key: 'status',
            header: 'Status',
            render: (row) => (
              <StatusChip label={labelFrom(CAMPAIGN_STATUSES, row.status, row.status)} tone={statusToneFromValue(row.status)} />
            ),
          },
          {
            key: 'priority',
            header: 'Priority',
            render: (row) => <StatusChip label={row.priority} tone={statusToneFromValue(row.priority)} />,
          },
          { key: 'window', header: 'Window', render: (row) => `${shortDate(row.start_date)} → ${shortDate(row.due_date)}` },
          {
            key: 'branches',
            header: 'Branches',
            render: (row) => (
              <span className="text-xs text-muted-foreground">
                {row.branches.map((branch) => branch.name).join(', ') || '—'}
              </span>
            ),
          },
          { key: 'expected', header: 'Expected', align: 'right', render: (row) => row.expected_assets },
          { key: 'verified', header: 'Verified', align: 'right', render: (row) => row.verified_assets },
          {
            key: 'completion',
            header: 'Completion',
            render: (row) => <ProgressBar value={row.completion} />,
          },
          { key: 'created', header: 'Created by', render: (row) => row.created_by_name || '—' },
          {
            key: 'actions',
            header: '',
            align: 'right',
            render: (row) => <RowActions items={actionsFor(row)} />,
          },
        ]}
        rows={rows}
        rowKey={(row) => row.id}
        loading={loading}
        emptyMessage="No campaigns match these filters."
        page={query.page}
        perPage={query.perPage}
        total={query.total}
        onPageChange={query.setPage}
        onPerPageChange={query.setPerPage}
      >
        <VerificationTabs />
        {error && <ErrorBanner message={error} />}
      </ListPageShell>

      <FormDialog
        open={dialogOpen}
        title={editing ? `Edit ${editing.code}` : 'New verification campaign'}
        onClose={() => setDialogOpen(false)}
        maxWidth="2xl"
        footer={
          <FormDialogFooter
            onCancel={() => setDialogOpen(false)}
            submitLabel={editing ? 'Save campaign' : 'Create campaign'}
            submitting={saving}
            formId="campaign-form"
          />
        }
      >
        <form
          id="campaign-form"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
          className="space-y-4"
        >
          {formError && <ErrorBanner message={formError} />}
          <CampaignForm draft={draft} onChange={setDraft} options={options} />
        </form>
      </FormDialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete campaign"
        message={
          deleting
            ? `Delete ${deleting.code} — ${deleting.name}? Only draft campaigns without verification activity can be deleted.`
            : ''
        }
        submitting={confirming}
        onConfirm={() => void remove()}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
