'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  Dropdown,
  InputField,
  MultiSelectField,
  PortButton,
  TextAreaField,
} from '@/components/ports';
import type { SelectOption } from '@/components/ports';
import {
  CAMPAIGN_PRIORITIES,
  CAMPAIGN_TYPES,
  SCOPE_TYPES,
  addDaysIso,
  progress,
  todayIso,
} from '@/lib/verification';

export type CampaignBranchOption = {
  id: string;
  name: string;
  country: string;
  province: string;
};

export type CampaignOfficerOption = SelectOption & { role?: string };

export type CampaignOptions = {
  branches: CampaignBranchOption[];
  officers: CampaignOfficerOption[];
  departments: SelectOption[];
  locations: SelectOption[];
  categories: SelectOption[];
};

export type CampaignDraft = {
  name: string;
  description: string;
  type: string;
  start_date: string;
  due_date: string;
  priority: string;
  scope_type: string;
  scope_values: string[];
  instructions: string;
  attachments: string;
  branches: {
    branch_id: string;
    name: string;
    country: string;
    province: string;
    officer_id: string;
    officer_name: string;
  }[];
};

export const EMPTY_CAMPAIGN: CampaignDraft = {
  name: '',
  description: '',
  type: 'full_physical',
  start_date: '',
  due_date: '',
  priority: 'normal',
  scope_type: 'all',
  scope_values: [],
  instructions: '',
  attachments: '',
  branches: [],
};

export function draftFromCampaign(campaign: {
  name: string;
  description?: string;
  type: string;
  start_date: string;
  due_date: string;
  priority: string;
  scope_type: string;
  scope_values?: string[];
  instructions?: string;
  attachments?: string[];
  branches: {
    branch_id: string;
    name: string;
    country: string;
    province: string;
    officer_id: string | null;
    officer_name: string;
  }[];
}): CampaignDraft {
  return {
    name: campaign.name,
    description: campaign.description ?? '',
    type: campaign.type,
    start_date: campaign.start_date,
    due_date: campaign.due_date,
    priority: campaign.priority,
    scope_type: campaign.scope_type,
    scope_values: campaign.scope_values ?? [],
    instructions: campaign.instructions ?? '',
    attachments: (campaign.attachments ?? []).join('\n'),
    branches: (campaign.branches ?? []).map((row) => ({
      branch_id: row.branch_id,
      name: row.name,
      country: row.country,
      province: row.province,
      officer_id: row.officer_id ?? '',
      officer_name: row.officer_name ?? '',
    })),
  };
}

export function campaignPayload(draft: CampaignDraft) {
  return {
    name: draft.name,
    description: draft.description,
    type: draft.type,
    start_date: draft.start_date || todayIso(),
    due_date: draft.due_date || addDaysIso(14),
    priority: draft.priority,
    scope_type: draft.scope_type,
    scope_values: draft.scope_type === 'all' ? [] : draft.scope_values,
    instructions: draft.instructions,
    attachments: draft.attachments
      .split('\n')
      .map((row) => row.trim())
      .filter(Boolean),
    branches: draft.branches,
  };
}

type CampaignFormProps = {
  draft: CampaignDraft;
  onChange: (draft: CampaignDraft) => void;
  options: CampaignOptions | null;
  /** Assets expected in the snapshot for the current scope, when known. */
  expectedCount?: number | null;
};

export default function CampaignForm({ draft, onChange, options, expectedCount }: CampaignFormProps) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
  }, [draft.branches.length]);

  const set = <K extends keyof CampaignDraft>(key: K, value: CampaignDraft[K]) =>
    onChange({ ...draft, [key]: value });

  const branchOptions = useMemo<SelectOption[]>(
    () => (options?.branches ?? []).map((row) => ({ value: row.id, label: `${row.name}${row.country ? ` — ${row.country}` : ''}` })),
    [options]
  );

  const scopeOptions =
    draft.scope_type === 'departments'
      ? options?.departments ?? []
      : draft.scope_type === 'locations'
        ? options?.locations ?? []
        : draft.scope_type === 'categories'
          ? options?.categories ?? []
          : [];

  const addBranch = (branchId: string) => {
    if (!branchId) return;
    const branch = options?.branches.find((row) => row.id === branchId);
    if (!branch) return;
    if (draft.branches.some((row) => row.branch_id === branchId)) {
      setError('That branch is already on the campaign.');
      return;
    }
    onChange({
      ...draft,
      branches: [
        ...draft.branches,
        {
          branch_id: branch.id,
          name: branch.name,
          country: branch.country,
          province: branch.province,
          officer_id: '',
          officer_name: '',
        },
      ],
    });
  };

  const updateBranch = (index: number, patch: Partial<CampaignDraft['branches'][number]>) => {
    onChange({
      ...draft,
      branches: draft.branches.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    });
  };

  const removeBranch = (index: number) => {
    onChange({ ...draft, branches: draft.branches.filter((_, i) => i !== index) });
  };

  const multiBranch = draft.branches.length > 1;

  return (
    <div className="space-y-5">
      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <InputField
          label="Campaign name"
          required
          value={draft.name}
          onChange={(event) => set('name', event.target.value)}
          placeholder="Annual head office physical audit"
          containerClassName="sm:col-span-2"
        />
        <div className="sm:col-span-2">
          <TextAreaField
            label="Description"
            value={draft.description}
            onChange={(event) => set('description', event.target.value)}
            placeholder="Why this campaign is being run and what it covers."
          />
        </div>
        <Dropdown
          label="Campaign type"
          required
          value={draft.type}
          onChange={(value) => set('type', value)}
          options={CAMPAIGN_TYPES.map((row) => ({ value: row.value, label: row.label }))}
        />
        <Dropdown
          label="Priority"
          required
          value={draft.priority}
          onChange={(value) => set('priority', value)}
          options={CAMPAIGN_PRIORITIES.map((row) => ({ value: row.value, label: row.label }))}
        />
        <InputField
          label="Start date"
          type="date"
          value={draft.start_date}
          onChange={(event) => set('start_date', event.target.value)}
        />
        <InputField
          label="Due date"
          type="date"
          value={draft.due_date}
          onChange={(event) => set('due_date', event.target.value)}
        />
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Branches and verification officers</p>
            <p className="text-xs text-muted-foreground">
              Each branch gets its own session. {multiBranch ? 'Province is required to assign assets once per branch.' : 'The branch province assigns the expected assets.'}
            </p>
          </div>
          <div className="min-w-[260px] flex-1 sm:max-w-xs">
            <Dropdown
              value=""
              onChange={addBranch}
              options={branchOptions.filter(
                (option) => !draft.branches.some((row) => row.branch_id === option.value)
              )}
              placeholder="Add branch…"
              clearable={false}
            />
          </div>
        </div>

        {draft.branches.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
            Add at least one branch to generate verification sessions.
          </p>
        ) : (
          <div className="space-y-2">
            {draft.branches.map((row, index) => (
              <div
                key={`${row.branch_id}-${index}`}
                className="grid gap-3 rounded-xl border border-border bg-muted/30 p-3 sm:grid-cols-[1fr_1fr_auto]"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{row.name}</p>
                  <p className="text-xs text-muted-foreground">{row.country || '—'}</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <InputField
                    aria-label={`${row.name} province`}
                    placeholder="Province"
                    value={row.province}
                    onChange={(event) => updateBranch(index, { province: event.target.value })}
                    required={multiBranch}
                  />
                  <Dropdown
                    value={row.officer_id}
                    onChange={(value) => {
                      const officer = options?.officers.find((item) => item.value === value);
                      updateBranch(index, { officer_id: value, officer_name: officer?.label ?? '' });
                    }}
                    options={options?.officers ?? []}
                    placeholder="Assign officer"
                    clearable
                  />
                </div>
                <PortButton
                  variant="ghost"
                  className="h-10 w-10 px-0 text-destructive"
                  onClick={() => removeBranch(index)}
                  aria-label={`Remove ${row.name}`}
                >
                  <Trash2 size={15} />
                </PortButton>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Dropdown
          label="Verification scope"
          value={draft.scope_type}
          onChange={(value) => onChange({ ...draft, scope_type: value, scope_values: [] })}
          options={SCOPE_TYPES.map((row) => ({ value: row.value, label: row.label }))}
        />
        {draft.scope_type !== 'all' ? (
          <MultiSelectField
            label={
              draft.scope_type === 'departments'
                ? 'Departments'
                : draft.scope_type === 'locations'
                  ? 'Locations'
                  : 'Asset categories'
            }
            value={draft.scope_values}
            onChange={(value) => set('scope_values', value)}
            options={scopeOptions}
            placeholder="Select values…"
            required
          />
        ) : (
          <div className="flex items-end">
            <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              All assets in the official inventory are snapshotted per branch when the campaign is saved.
              {expectedCount != null ? ` ${expectedCount.toLocaleString()} asset(s) currently match.` : ''}
            </p>
          </div>
        )}
        <div className="sm:col-span-2">
          <TextAreaField
            label="Instructions for officers"
            value={draft.instructions}
            onChange={(event) => set('instructions', event.target.value)}
            placeholder="Steps, safety notes, and what counts as evidence."
          />
        </div>
        <div className="sm:col-span-2">
          <TextAreaField
            label="Attachments (one URL per line)"
            value={draft.attachments}
            onChange={(event) => set('attachments', event.target.value)}
            placeholder="https://…"
            hint="Link checklists or signed memos. Evidence photos are uploaded by officers in the workspace."
          />
        </div>
      </div>
    </div>
  );
}

export function campaignProgress(campaign: { verified_assets?: number; expected_assets?: number }) {
  return progress(campaign.verified_assets ?? 0, campaign.expected_assets ?? 0);
}
