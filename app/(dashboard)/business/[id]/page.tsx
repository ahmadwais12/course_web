'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Dropdown,
  ErrorBanner,
  FormDialog,
  FormDialogFooter,
  InputField,
  ListPageShell,
  PortButton,
  StatusChip,
  statusToneFromValue,
  TextAreaField,
} from '@/components/ports';
import PageHeader from '@/components/ports/PageHeader';
import { toast } from '@/components/ui/Toast';
import { useListQuery } from '@/hooks/useListQuery';
import {
  BUSINESS_STATUSES,
  businessStatusFromRow,
  toSlug,
  coverUrlFromRow,
  type BusinessRow,
  type BusinessStatus,
} from '@/lib/business';
import { publicBusinessPath, publicBusinessUrl } from '@/lib/business-url';

type BusinessDetail = BusinessRow & { branches?: BusinessRow[] };

export default function BusinessDetailPage() {
  const params = useParams();
  const id = String(params.id ?? '');
  const router = useRouter();

  const [business, setBusiness] = useState<BusinessDetail | null>(null);
  const [branches, setBranches] = useState<BusinessRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [tenantCode, setTenantCode] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [businessStatus, setBusinessStatus] = useState<BusinessStatus>('pending');
  const [savingStatus, setSavingStatus] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/businesses/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load business');
      setBusiness(data);
      setBranches(Array.isArray(data.branches) ? data.branches : []);
      setBusinessStatus(businessStatusFromRow(data));
      setError(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load business';
      setBusiness(null);
      setBranches([]);
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const list = useListQuery({
    items: branches as (BusinessRow & Record<string, unknown>)[],
    searchKeys: ['name', 'slug', 'tenant_code', 'email', 'phone'],
  });

  const statusOptions = useMemo(
    () => [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
    ],
    []
  );

  const businessStatusOptions = useMemo(
    () => BUSINESS_STATUSES.map((item) => ({ value: item.value, label: item.label })),
    []
  );

  const saveBusinessStatus = async () => {
    if (!id) return;
    setSavingStatus(true);
    try {
      const res = await fetch(`/api/businesses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: businessStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update status');
      setBusiness((prev) => (prev ? { ...prev, ...data, status: businessStatusFromRow(data) } : data));
      toast.success(`Status set to ${businessStatus}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setSavingStatus(false);
    }
  };

  const resetBranchForm = () => {
    setName('');
    setSlug('');
    setSlugTouched(false);
    setTenantCode('');
    setDescription('');
    setEmail('');
    setPhone('');
    setAddress('');
    setStatus('active');
    setFormError(null);
  };

  const openBranchModal = () => {
    resetBranchForm();
    setShowBranchModal(true);
    if (!id) return;
    fetch(`/api/businesses/next-code?type=branch&parent_id=${encodeURIComponent(id)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.tenant_code) setTenantCode(String(data.tenant_code));
      })
      .catch(() => {
        setTenantCode('');
      });
  };

  const onNameChange = (value: string) => {
    setName(value);
    if (!slugTouched) setSlug(toSlug(value));
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim() || !slug.trim()) {
      const message = 'Name and slug are required';
      setFormError(message);
      toast.error(message);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/businesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim() || null,
          email: email.trim() || null,
          phone: phone.trim() || null,
          address: address.trim() || null,
          is_active: status === 'active',
          organization_type: 'branch',
          parent_tenant_id: id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create branch');
      toast.success(data.tenant_code ? `Branch created · ${data.tenant_code}` : 'Branch created');
      setShowBranchModal(false);
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create branch';
      setFormError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-up">
      <PageHeader
        title={business?.name || 'Business'}
        description={
          business
            ? `${publicBusinessPath(business.slug)}${business.tenant_code ? ` · ${business.tenant_code}` : ''}`
            : 'Business details and branches'
        }
        pill={loading ? 'LOADING…' : 'LIVE DATA'}
        pillTone={loading ? 'neutral' : 'live'}
        actions={
          <div className="flex flex-wrap gap-2">
            <PortButton variant="ghost" onClick={() => router.push('/business')}>
              Back
            </PortButton>
            {business && (
              <PortButton
                variant="secondary"
                disabled={businessStatusFromRow(business) !== 'active'}
                onClick={() =>
                  window.open(publicBusinessPath(business.slug), '_blank', 'noopener,noreferrer')
                }
              >
                Open site
              </PortButton>
            )}
            <PortButton variant="primary" onClick={openBranchModal} disabled={!business}>
              Add Branch
            </PortButton>
          </div>
        }
      />

      {error && <ErrorBanner message={error} />}

      {business && (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          {coverUrlFromRow(business) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverUrlFromRow(business) ?? ''}
              alt=""
              className="h-40 w-full object-cover"
            />
          )}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 p-4">
          {business.logo_url && (
            <div className="sm:col-span-2 lg:col-span-4 flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={business.logo_url}
                alt={`${business.name} logo`}
                className="h-14 w-14 rounded-xl border border-border object-cover"
              />
              <p className="text-sm text-muted-foreground">Business logo</p>
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground">Business type</p>
            <p className="font-medium">{business.business_type_name || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Public URL</p>
            <p className="font-medium break-all">
              {typeof window !== 'undefined'
                ? publicBusinessUrl(business.slug, window.location.origin)
                : publicBusinessPath(business.slug)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Organization</p>
            <p className="font-medium capitalize">{business.organization_type}</p>
          </div>
          <div className="sm:col-span-2 lg:col-span-2 space-y-2">
            <Dropdown
              label="Status"
              value={businessStatus}
              onChange={(value) => setBusinessStatus(value as BusinessStatus)}
              options={businessStatusOptions}
              hint="New businesses start as Pending. Set Active when the site should go live."
            />
            <PortButton
              variant="primary"
              disabled={savingStatus || businessStatus === businessStatusFromRow(business)}
              onClick={saveBusinessStatus}
            >
              {savingStatus ? 'Saving…' : 'Save status'}
            </PortButton>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Plan</p>
            <p className="font-medium uppercase">{business.plan || 'standard'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Contact</p>
            <p className="font-medium text-sm">{business.email || business.phone || '—'}</p>
          </div>
          {business.description && (
            <div className="sm:col-span-2 lg:col-span-4">
              <p className="text-xs text-muted-foreground">Description</p>
              <p className="text-sm">{business.description}</p>
            </div>
          )}
          </div>
        </div>
      )}

      <ListPageShell
        title="Branches"
        description={`Branches under ${business?.name || 'this business'}`}
        primaryAction={{ label: 'Add Branch', onClick: openBranchModal }}
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search branches…"
        onResetFilters={() => list.reset()}
        loading={loading}
        columns={[
          {
            key: 'name',
            header: 'Branch',
            render: (r) => (
              <div>
                <div className="font-semibold">{r.name || '—'}</div>
                <div className="text-xs text-muted-foreground">{r.slug}</div>
              </div>
            ),
          },
          {
            key: 'tenant_code',
            header: 'Code',
            render: (r) => r.tenant_code || '—',
          },
          {
            key: 'email',
            header: 'Contact',
            render: (r) => r.email || r.phone || '—',
          },
          {
            key: 'address',
            header: 'Address',
            render: (r) => r.address || '—',
          },
          {
            key: 'status',
            header: 'Status',
            render: (r) => {
              const label = r.is_active ? 'active' : 'inactive';
              return <StatusChip label={label} tone={statusToneFromValue(label)} />;
            },
          },
        ]}
        rows={list.rows as BusinessRow[]}
        rowKey={(r) => r.id}
        page={list.page}
        perPage={list.perPage}
        total={list.total}
        onPageChange={list.setPage}
        onPerPageChange={list.setPerPage}
        emptyMessage="No branches yet. Add the first branch for this business."
      />

      <FormDialog
        open={showBranchModal}
        title="Add Branch"
        onClose={() => setShowBranchModal(false)}
        maxWidth="2xl"
        footer={
          <FormDialogFooter
            onCancel={() => setShowBranchModal(false)}
            submitLabel="Create Branch"
            submitting={submitting}
            formId="branch-form"
          />
        }
      >
        <form id="branch-form" onSubmit={handleCreateBranch} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <InputField
                label="Branch name"
                required
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
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
            <InputField
              label="Branch code"
              value={tenantCode}
              disabled
              placeholder="Loading code…"
              hint="Generated by the system from the parent business code."
            />
            <InputField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <InputField label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <InputField
              label="Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
            <Dropdown
              label="Status"
              value={status}
              onChange={(v) => setStatus(v as 'active' | 'inactive')}
              options={statusOptions}
            />
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
    </div>
  );
}
