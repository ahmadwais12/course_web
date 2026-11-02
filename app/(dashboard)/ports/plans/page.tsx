'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dropdown,
  ErrorBanner,
  FormDialog,
  FormDialogFooter,
  InputField,
  ListPageShell,
  RowActions,
  StatusChip,
  statusToneFromValue,
  TextAreaField,
} from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import { useListQuery } from '@/hooks/useListQuery';
import { toSlug } from '@/lib/business';
import {
  BUSINESS_PLAN_BILLING_INTERVALS,
  BUSINESS_PLAN_STATUSES,
  formatPlanDuration,
  formatPlanLimit,
  formatPlanPrice,
  hydrateBusinessPlan,
  type BusinessPlanBillingInterval,
  type BusinessPlanRow,
  type BusinessPlanStatus,
} from '@/lib/business-plans';

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}

export default function BusinessPlansPage() {
  const [items, setItems] = useState<BusinessPlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<BusinessPlanRow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState('');
  const [formStatus, setFormStatus] = useState<BusinessPlanStatus>('active');
  const [price, setPrice] = useState('0');
  const [currency, setCurrency] = useState('AFN');
  const [billingInterval, setBillingInterval] =
    useState<BusinessPlanBillingInterval>('monthly');
  const [durationMonths, setDurationMonths] = useState('1');
  const [trialDays, setTrialDays] = useState('0');
  const [maxUsers, setMaxUsers] = useState('50');
  const [maxStorageMb, setMaxStorageMb] = useState('1024');
  const [maxBranches, setMaxBranches] = useState('1');
  const [features, setFeatures] = useState('');
  const [sortOrder, setSortOrder] = useState('0');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/business-plans');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load plans');
      setItems((Array.isArray(data) ? data : []).map((row) => hydrateBusinessPlan(row)));
      setError(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load plans';
      setItems([]);
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filterFn = useCallback(
    (item: BusinessPlanRow) => !status || item.status === status,
    [status]
  );

  const list = useListQuery({
    items: items as (BusinessPlanRow & Record<string, unknown>)[],
    searchKeys: ['name', 'slug', 'description', 'currency', 'billing_interval', 'features'],
    filterKey: status,
    filterFn: filterFn as (item: BusinessPlanRow & Record<string, unknown>) => boolean,
  });

  const statusOptions = useMemo(
    () => BUSINESS_PLAN_STATUSES.map((item) => ({ value: item.value, label: item.label })),
    []
  );

  const billingOptions = useMemo(
    () => BUSINESS_PLAN_BILLING_INTERVALS.map((item) => ({ value: item.value, label: item.label })),
    []
  );

  const resetForm = () => {
    setName('');
    setSlug('');
    setSlugTouched(false);
    setDescription('');
    setFormStatus('active');
    setPrice('0');
    setCurrency('AFN');
    setBillingInterval('monthly');
    setDurationMonths('1');
    setTrialDays('0');
    setMaxUsers('50');
    setMaxStorageMb('1024');
    setMaxBranches('1');
    setFeatures('');
    setSortOrder('0');
    setFormError(null);
  };

  const openCreate = () => {
    resetForm();
    setEditing(null);
    setShowModal(true);
  };

  const openEdit = (row: BusinessPlanRow) => {
    setEditing(row);
    setName(row.name);
    setSlug(row.slug);
    setSlugTouched(true);
    setDescription(row.description || '');
    setFormStatus(row.status || (row.is_active ? 'active' : 'inactive'));
    setPrice(String(row.price ?? 0));
    setCurrency(row.currency || 'AFN');
    setBillingInterval(row.billing_interval || 'monthly');
    setDurationMonths(row.duration_months == null ? '' : String(row.duration_months));
    setTrialDays(String(row.trial_days ?? 0));
    setMaxUsers(row.max_users == null ? '' : String(row.max_users));
    setMaxStorageMb(row.max_storage_mb == null ? '' : String(row.max_storage_mb));
    setMaxBranches(row.max_branches == null ? '' : String(row.max_branches));
    setFeatures((row.features || []).join('\n'));
    setSortOrder(String(row.sort_order ?? 0));
    setFormError(null);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) {
      const message = 'Name and slug are required';
      setFormError(message);
      toast.error(message);
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch(editing ? `/api/business-plans/${editing.id}` : '/api/business-plans', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim() || null,
          status: formStatus,
          is_active: formStatus === 'active',
          price: price.trim() === '' ? 0 : Number(price),
          currency: currency.trim() || 'AFN',
          billing_interval: billingInterval,
          duration_months: durationMonths.trim() === '' ? null : Number(durationMonths),
          trial_days: trialDays.trim() === '' ? 0 : Number(trialDays),
          max_users: maxUsers.trim() === '' ? null : Number(maxUsers),
          max_storage_mb: maxStorageMb.trim() === '' ? null : Number(maxStorageMb),
          max_branches: maxBranches.trim() === '' ? null : Number(maxBranches),
          features,
          sort_order: sortOrder.trim() === '' ? 0 : Number(sortOrder),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      toast.success(editing ? 'Plan updated' : 'Plan created');
      setShowModal(false);
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Save failed';
      setFormError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (row: BusinessPlanRow) => {
    if (!confirm(`Delete plan "${row.name}"?`)) return;
    try {
      const res = await fetch(`/api/business-plans/${row.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      toast.success(`"${row.name}" deleted`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <>
      <ListPageShell
        title="Plans"
        description="Manage plan pricing, duration, features, and storage/user limits."
        primaryAction={{ label: 'Add Plan', onClick: openCreate }}
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search plans…"
        onResetFilters={() => {
          list.reset();
          setStatus('');
        }}
        filters={[
          {
            key: 'status',
            label: 'Status',
            value: status,
            options: statusOptions,
            onChange: setStatus,
          },
        ]}
        loading={loading}
        columns={[
          {
            key: 'name',
            header: 'Name',
            render: (r) => <span className="font-semibold">{r.name || '—'}</span>,
          },
          {
            key: 'slug',
            header: 'Slug',
            render: (r) => r.slug || '—',
          },
          {
            key: 'price',
            header: 'Price',
            render: (r) => formatPlanPrice(r),
          },
          {
            key: 'duration',
            header: 'Duration',
            render: (r) => formatPlanDuration(r),
          },
          {
            key: 'billing_interval',
            header: 'Billing',
            render: (r) => r.billing_interval || '—',
          },
          {
            key: 'max_users',
            header: 'Users',
            render: (r) => formatPlanLimit(r.max_users),
          },
          {
            key: 'max_storage_mb',
            header: 'Storage',
            render: (r) => formatPlanLimit(r.max_storage_mb, 'MB'),
          },
          {
            key: 'max_branches',
            header: 'Branches',
            render: (r) => formatPlanLimit(r.max_branches),
          },
          {
            key: 'trial_days',
            header: 'Trial',
            render: (r) => (r.trial_days ? `${r.trial_days} days` : '—'),
          },
          {
            key: 'features',
            header: 'Features',
            className: 'w-[14rem] max-w-[14rem]',
            render: (r) => {
              const text = (r.features || []).join(', ');
              if (!text) return '—';
              return (
                <span className="block w-[14rem] max-w-[14rem] truncate" title={text}>
                  {text}
                </span>
              );
            },
          },
          {
            key: 'status',
            header: 'Status',
            render: (r) => {
              const label = r.status || (r.is_active ? 'active' : 'inactive');
              return <StatusChip label={label} tone={statusToneFromValue(label)} />;
            },
          },
          {
            key: 'updated_at',
            header: 'Updated',
            render: (r) => formatDateTime(r.updated_at || r.created_at),
          },
          {
            key: 'actions',
            header: 'Actions',
            align: 'right',
            render: (r) => (
              <RowActions onEdit={() => openEdit(r)} onDelete={() => handleDelete(r)} />
            ),
          },
        ]}
        rows={list.rows as BusinessPlanRow[]}
        rowKey={(r) => r.id}
        page={list.page}
        perPage={list.perPage}
        total={list.total}
        onPageChange={list.setPage}
        onPerPageChange={list.setPerPage}
        emptyMessage="No plans yet. Add the first plan."
      >
        {error && <ErrorBanner message={error} />}
      </ListPageShell>

      <FormDialog
        open={showModal}
        title={editing ? 'Edit Plan' : 'Add Plan'}
        onClose={() => setShowModal(false)}
        maxWidth="2xl"
        footer={
          <FormDialogFooter
            onCancel={() => setShowModal(false)}
            submitLabel={editing ? 'Save Plan' : 'Create Plan'}
            submitting={submitting}
            formId="business-plan-form"
          />
        }
      >
        <form id="business-plan-form" onSubmit={handleSave} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <InputField
                label="Plan name"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!slugTouched) setSlug(toSlug(e.target.value));
                }}
                placeholder="e.g. Standard"
              />
            </div>
            <InputField
              label="Slug"
              required
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(toSlug(e.target.value));
              }}
            />
            <Dropdown
              label="Status"
              value={formStatus}
              onChange={(v) => setFormStatus(v as BusinessPlanStatus)}
              options={statusOptions}
            />
            <InputField
              label="Price"
              type="number"
              min={0}
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
            <InputField
              label="Currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              placeholder="AFN"
            />
            <Dropdown
              label="Billing interval"
              value={billingInterval}
              onChange={(v) => setBillingInterval(v as BusinessPlanBillingInterval)}
              options={billingOptions}
            />
            <InputField
              label="Duration (months)"
              type="number"
              min={0}
              value={durationMonths}
              onChange={(e) => setDurationMonths(e.target.value)}
              hint="Leave empty for unlimited / lifetime"
            />
            <InputField
              label="Trial days"
              type="number"
              min={0}
              value={trialDays}
              onChange={(e) => setTrialDays(e.target.value)}
            />
            <InputField
              label="Max users"
              type="number"
              min={0}
              value={maxUsers}
              onChange={(e) => setMaxUsers(e.target.value)}
              hint="Leave empty for unlimited"
            />
            <InputField
              label="Max storage (MB)"
              type="number"
              min={0}
              value={maxStorageMb}
              onChange={(e) => setMaxStorageMb(e.target.value)}
              hint="Leave empty for unlimited"
            />
            <InputField
              label="Max branches"
              type="number"
              min={0}
              value={maxBranches}
              onChange={(e) => setMaxBranches(e.target.value)}
              hint="Leave empty for unlimited"
            />
            <InputField
              label="Sort order"
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            />
            <div className="sm:col-span-2">
              <TextAreaField
                label="Features"
                value={features}
                onChange={(e) => setFeatures(e.target.value)}
                rows={4}
                hint="One feature per line, or separate with commas"
              />
            </div>
            <div className="sm:col-span-2">
              <TextAreaField
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          {formError && <ErrorBanner message={formError} />}
        </form>
      </FormDialog>
    </>
  );
}
