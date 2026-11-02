'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dropdown,
  ErrorBanner,
  FormDialog,
  FormDialogFooter,
  InputField,
  ListPageShell,
  PortButton,
  RowActions,
  StatusChip,
  statusToneFromValue,
  TextAreaField,
} from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import { useListQuery } from '@/hooks/useListQuery';
import {
  BUSINESS_STATUSES,
  businessStatusFromRow,
  statusNotesFromRow,
  toSlug,
  type BusinessRow,
  type BusinessStatus,
} from '@/lib/business';
import { CircleDot, Eye, Pencil, Trash2 } from 'lucide-react';

export default function BranchesListPage() {
  const router = useRouter();
  const [items, setItems] = useState<BusinessRow[]>([]);
  const [businesses, setBusinesses] = useState<BusinessRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [businessFilter, setBusinessFilter] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [parentId, setParentId] = useState('');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [tenantCode, setTenantCode] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [branchStatus, setBranchStatus] = useState<'active' | 'inactive'>('active');
  const [formError, setFormError] = useState<string | null>(null);

  const [selected, setSelected] = useState<BusinessRow | null>(null);
  const [showView, setShowView] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editSlugTouched, setEditSlugTouched] = useState(false);
  const [editParentId, setEditParentId] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const [showStatus, setShowStatus] = useState(false);
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [changeStatus, setChangeStatus] = useState<BusinessStatus>('pending');
  const [changeDescription, setChangeDescription] = useState('');

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const stamp = Date.now();
      const [branchRes, businessRes] = await Promise.all([
        fetch(`/api/businesses?type=branch&_=${stamp}`, { cache: 'no-store' }),
        fetch(`/api/businesses?type=central&_=${stamp}`, { cache: 'no-store' }),
      ]);
      const branchData = await branchRes.json();
      const businessData = await businessRes.json();
      if (!branchRes.ok) throw new Error(branchData.error || 'Failed to load branches');
      if (!businessRes.ok) throw new Error(businessData.error || 'Failed to load businesses');
      setItems(Array.isArray(branchData) ? branchData : []);
      setBusinesses(Array.isArray(businessData) ? businessData : []);
      setError(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load branches';
      setItems([]);
      setError(message);
      toast.error(message);
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, []);

  const refreshPage = useCallback(async () => {
    await load({ silent: true });
    router.refresh();
  }, [load, router]);

  useEffect(() => {
    load();
  }, [load]);

  const filterFn = useCallback(
    (item: BusinessRow) => {
      const statusOk = !status || businessStatusFromRow(item) === status;
      const businessOk = !businessFilter || item.parent_tenant_id === businessFilter;
      return statusOk && businessOk;
    },
    [status, businessFilter]
  );

  const list = useListQuery({
    items: items as (BusinessRow & Record<string, unknown>)[],
    searchKeys: ['name', 'slug', 'tenant_code', 'parent_name', 'email', 'description', 'description_text'],
    filterKey: `${status}|${businessFilter}`,
    filterFn: filterFn as (item: BusinessRow & Record<string, unknown>) => boolean,
  });

  const statusOptions = useMemo(
    () => BUSINESS_STATUSES.map((item) => ({ value: item.value, label: item.label })),
    []
  );

  const createStatusOptions = useMemo(
    () => [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
    ],
    []
  );

  const businessOptions = useMemo(
    () =>
      businesses.map((row) => ({
        value: row.id,
        label: row.tenant_code ? `${row.name} · ${row.tenant_code}` : row.name,
      })),
    [businesses]
  );

  const selectedParent = useMemo(
    () => businesses.find((row) => row.id === parentId) ?? null,
    [businesses, parentId]
  );

  const resetForm = () => {
    setParentId('');
    setName('');
    setSlug('');
    setSlugTouched(false);
    setTenantCode('');
    setDescription('');
    setEmail('');
    setPhone('');
    setAddress('');
    setBranchStatus('active');
    setFormError(null);
  };

  const openCreate = () => {
    if (!businesses.length) {
      toast.error('Create a business first, then add a branch under it.');
      router.push('/business/create');
      return;
    }
    resetForm();
    setShowModal(true);
  };

  const onParentChange = (value: string) => {
    setParentId(value);
    setTenantCode('');
    if (!value) return;
    fetch(`/api/businesses/next-code?type=branch&parent_id=${encodeURIComponent(value)}`)
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

  useEffect(() => {
    if (loading) return;
    const params = new URLSearchParams(window.location.search);
    const shouldCreate = params.get('create') === '1' || Boolean(params.get('business'));
    if (!shouldCreate) return;

    if (!businesses.length) {
      toast.error('Create a business first, then add a branch under it.');
      router.replace('/business/create');
      return;
    }

    const businessId = params.get('business') || '';
    resetForm();
    setShowModal(true);
    if (businessId && businesses.some((row) => row.id === businessId)) {
      setBusinessFilter(businessId);
      onParentChange(businessId);
    }
    router.replace('/business/branches', { scroll: false });
    // Open once from the business list query, then clear the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, businesses, router]);

  const openView = (row: BusinessRow) => {
    setSelected(row);
    setShowView(true);
  };

  const openEdit = (row: BusinessRow) => {
    setSelected(row);
    setEditName(row.name || '');
    setEditSlug(row.slug || '');
    setEditSlugTouched(true);
    setEditParentId(row.parent_tenant_id || '');
    setEditEmail(row.email || '');
    setEditPhone(row.phone || '');
    setEditAddress(row.address || '');
    setEditDescription(row.description || '');
    setEditError(null);
    setShowEdit(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    if (!editParentId) {
      const message = 'Select a business first';
      setEditError(message);
      toast.error(message);
      return;
    }
    if (!editName.trim() || !editSlug.trim()) {
      const message = 'Name and slug are required';
      setEditError(message);
      toast.error(message);
      return;
    }

    setEditSubmitting(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/businesses/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          slug: editSlug.trim(),
          email: editEmail.trim() || null,
          phone: editPhone.trim() || null,
          address: editAddress.trim() || null,
          description: editDescription.trim() || null,
          organization_type: 'branch',
          parent_tenant_id: editParentId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update branch');
      toast.success('Branch updated');
      setShowEdit(false);
      setSelected(null);
      await refreshPage();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update branch';
      setEditError(message);
      toast.error(message);
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = async (row: BusinessRow) => {
    if (!confirm(`Delete branch "${row.name}"?`)) return;
    try {
      const res = await fetch(`/api/businesses/${row.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to delete branch');
      toast.success(`"${row.name}" deleted`);
      await refreshPage();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete branch');
    }
  };

  const openChangeStatus = (row: BusinessRow) => {
    setSelected(row);
    setChangeStatus(businessStatusFromRow(row));
    setChangeDescription('');
    setStatusError(null);
    setShowStatus(true);
  };

  const statusDescriptionRequired =
    selected != null &&
    !(businessStatusFromRow(selected) === 'pending' && changeStatus === 'active');

  const handleChangeStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;

    if (statusDescriptionRequired && !changeDescription.trim()) {
      const message = 'Description is required for this status change';
      setStatusError(message);
      toast.error(message);
      return;
    }

    setStatusSubmitting(true);
    setStatusError(null);
    try {
      const payload: { status: BusinessStatus; description?: string | null } = {
        status: changeStatus,
      };
      if (changeDescription.trim()) payload.description = changeDescription.trim();
      const res = await fetch(`/api/businesses/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to change status');
      toast.success(`Status set to ${changeStatus}`);
      setShowStatus(false);
      setSelected(null);
      await refreshPage();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to change status';
      setStatusError(message);
      toast.error(message);
    } finally {
      setStatusSubmitting(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!parentId) {
      const message = 'Select a business first';
      setFormError(message);
      toast.error(message);
      return;
    }
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
          is_active: branchStatus === 'active',
          organization_type: 'branch',
          parent_tenant_id: parentId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create branch');
      toast.success(data.tenant_code ? `Branch created · ${data.tenant_code}` : 'Branch created');
      setShowModal(false);
      await refreshPage();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create branch';
      setFormError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ListPageShell
      title="Branches"
      description="Select a business first, then add a branch under it."
      primaryAction={{
        label: 'Add Branch',
        onClick: openCreate,
      }}
      search={list.search}
      onSearchChange={list.setSearch}
      searchPlaceholder="Search branches…"
      onResetFilters={() => {
        list.reset();
        setStatus('');
        setBusinessFilter('');
      }}
      filters={[
        {
          key: 'business',
          label: 'Business',
          value: businessFilter,
          options: businessOptions,
          onChange: setBusinessFilter,
        },
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
          header: 'Branch',
          render: (r) => (
            <div>
              <div className="font-semibold">{r.name || '—'}</div>
              <div className="text-xs text-muted-foreground">{r.slug}</div>
            </div>
          ),
        },
        {
          key: 'parent_name',
          header: 'Business',
          render: (r) => r.parent_name || '—',
        },
        {
          key: 'tenant_code',
          header: 'Code',
          render: (r) => r.tenant_code || '—',
        },
        {
          key: 'email',
          header: 'Email',
          render: (r) => r.email || '—',
        },
        {
          key: 'description',
          header: 'Description',
          className: 'w-[11rem] max-w-[11rem]',
          render: (r) => {
            const notes = statusNotesFromRow(r);
            const latest = notes[notes.length - 1];
            if (!latest) return r.description || '—';
            return (
              <span className="block w-[11rem] max-w-[11rem] truncate" title={latest.text}>
                {latest.text}
              </span>
            );
          },
        },
        {
          key: 'status',
          header: 'Status',
          render: (r) => {
            const label = businessStatusFromRow(r);
            return <StatusChip label={label} tone={statusToneFromValue(label)} />;
          },
        },
        {
          key: 'actions',
          header: 'Actions',
          align: 'right',
          render: (r) => (
            <RowActions
              items={[
                {
                  key: 'view',
                  label: 'View',
                  icon: <Eye size={16} />,
                  onClick: () => openView(r),
                },
                {
                  key: 'edit',
                  label: 'Edit',
                  icon: <Pencil size={16} />,
                  onClick: () => openEdit(r),
                },
                {
                  key: 'status',
                  label: 'Change Status',
                  icon: <CircleDot size={16} />,
                  onClick: () => openChangeStatus(r),
                },
                {
                  key: 'delete',
                  label: 'Delete',
                  icon: <Trash2 size={16} />,
                  danger: true,
                  onClick: () => handleDelete(r),
                },
              ]}
            />
          ),
        },
      ]}
      rows={list.rows as BusinessRow[]}
      rowKey={(r) => r.id}
      page={list.page}
      perPage={list.perPage}
      total={list.total}
      onPageChange={list.setPage}
      onPerPageChange={list.setPerPage}
      emptyMessage="No branches yet. Add a branch after you select a business."
    >
      {error && <ErrorBanner message={error} />}
      <FormDialog
        open={showModal}
        title="Add Branch"
        onClose={() => setShowModal(false)}
        maxWidth="2xl"
        footer={
          <FormDialogFooter
            onCancel={() => setShowModal(false)}
            submitLabel="Create Branch"
            submitting={submitting}
            formId="branches-form"
          />
        }
      >
        <form id="branches-form" onSubmit={handleCreate} className="space-y-4">
          <Dropdown
            label="Business"
            required
            value={parentId}
            onChange={onParentChange}
            options={businessOptions}
            placeholder={businessOptions.length ? 'Select a business first' : 'No businesses yet'}
            hint={
              selectedParent
                ? `Branch will be created under ${selectedParent.name}`
                : 'A branch must belong to an existing business.'
            }
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <InputField
                label="Branch name"
                required
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                disabled={!parentId}
              />
            </div>
            <InputField
              label="Slug"
              required
              value={slug}
              disabled={!parentId}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(toSlug(e.target.value));
              }}
            />
            <InputField
              label="Branch code"
              value={tenantCode}
              disabled
              placeholder={parentId ? 'Loading code…' : 'Select a business first'}
              hint="Generated from the selected business code."
            />
            <InputField
              label="Email"
              type="email"
              value={email}
              disabled={!parentId}
              onChange={(e) => setEmail(e.target.value)}
            />
            <InputField
              label="Phone"
              value={phone}
              disabled={!parentId}
              onChange={(e) => setPhone(e.target.value)}
            />
            <InputField
              label="Address"
              value={address}
              disabled={!parentId}
              onChange={(e) => setAddress(e.target.value)}
            />
            <Dropdown
              label="Status"
              value={branchStatus}
              onChange={(v) => setBranchStatus(v as 'active' | 'inactive')}
              options={createStatusOptions}
              disabled={!parentId}
            />
            <div className="sm:col-span-2">
              <TextAreaField
                label="Description"
                value={description}
                disabled={!parentId}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          {!businesses.length && (
            <ErrorBanner message="Create a business first. Branches cannot exist without a parent business." />
          )}
          {formError && <ErrorBanner message={formError} />}
        </form>
      </FormDialog>

      <FormDialog
        open={showView && Boolean(selected)}
        title="Branch details"
        onClose={() => setShowView(false)}
        maxWidth="lg"
        footer={
          <>
            <PortButton
              variant="secondary"
              onClick={() => {
                if (!selected) return;
                setShowView(false);
                openEdit(selected);
              }}
            >
              Edit
            </PortButton>
            <PortButton variant="primary" onClick={() => setShowView(false)}>
              Close
            </PortButton>
          </>
        }
      >
        {selected && (
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Branch</dt>
              <dd className="text-lg font-semibold">{selected.name}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Code</dt>
              <dd className="font-medium">{selected.tenant_code || '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Business</dt>
              <dd className="font-medium">{selected.parent_name || '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Slug</dt>
              <dd className="font-medium">{selected.slug || '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Status</dt>
              <dd>
                <StatusChip
                  label={businessStatusFromRow(selected)}
                  tone={statusToneFromValue(businessStatusFromRow(selected))}
                />
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Email</dt>
              <dd className="font-medium">{selected.email || '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Phone</dt>
              <dd className="font-medium">{selected.phone || '—'}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Address</dt>
              <dd className="font-medium">{selected.address || '—'}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Description</dt>
              <dd className="space-y-1 font-medium">
                {statusNotesFromRow(selected).length
                  ? statusNotesFromRow(selected).map((note, index) => (
                      <p key={`${note.at}-${index}`}>{note.text}</p>
                    ))
                  : selected.description || '—'}
              </dd>
            </div>
          </dl>
        )}
      </FormDialog>

      <FormDialog
        open={showEdit && Boolean(selected)}
        title={selected ? `Edit branch · ${selected.name}` : 'Edit branch'}
        onClose={() => {
          setShowEdit(false);
          setSelected(null);
        }}
        maxWidth="2xl"
        footer={
          <FormDialogFooter
            onCancel={() => {
              setShowEdit(false);
              setSelected(null);
            }}
            submitLabel="Save changes"
            submitting={editSubmitting}
            formId="edit-branch-form"
          />
        }
      >
        <form id="edit-branch-form" onSubmit={handleEdit} className="space-y-4">
          <Dropdown
            label="Business"
            required
            value={editParentId}
            onChange={setEditParentId}
            options={businessOptions}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <InputField
                label="Branch name"
                required
                value={editName}
                onChange={(e) => {
                  setEditName(e.target.value);
                  if (!editSlugTouched) setEditSlug(toSlug(e.target.value));
                }}
              />
            </div>
            <InputField
              label="Slug"
              required
              value={editSlug}
              onChange={(e) => {
                setEditSlugTouched(true);
                setEditSlug(toSlug(e.target.value));
              }}
            />
            <InputField
              label="Branch code"
              value={selected?.tenant_code || ''}
              disabled
              hint="Assigned by the system and cannot be changed."
            />
            <InputField
              label="Email"
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
            />
            <InputField
              label="Phone"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
            />
            <InputField
              label="Address"
              value={editAddress}
              onChange={(e) => setEditAddress(e.target.value)}
            />
            <div className="sm:col-span-2">
              <TextAreaField
                label="Description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          {editError && <ErrorBanner message={editError} />}
        </form>
      </FormDialog>

      <FormDialog
        open={showStatus && Boolean(selected)}
        title={selected ? `Change status · ${selected.name}` : 'Change status'}
        onClose={() => {
          setShowStatus(false);
          setSelected(null);
        }}
        maxWidth="lg"
        footer={
          <FormDialogFooter
            onCancel={() => {
              setShowStatus(false);
              setSelected(null);
            }}
            submitLabel="Save status"
            submitting={statusSubmitting}
            formId="change-branch-status-form"
          />
        }
      >
        <form id="change-branch-status-form" onSubmit={handleChangeStatus} className="space-y-4">
          {selected && (
            <p className="text-sm text-muted-foreground">
              Current status:{' '}
              <StatusChip
                label={businessStatusFromRow(selected)}
                tone={statusToneFromValue(businessStatusFromRow(selected))}
              />
            </p>
          )}
          <Dropdown
            label="Status"
            required
            value={changeStatus}
            onChange={(value) => setChangeStatus(value as BusinessStatus)}
            options={statusOptions}
          />
          <TextAreaField
            label="Description"
            required={statusDescriptionRequired}
            value={changeDescription}
            onChange={(e) => setChangeDescription(e.target.value)}
            rows={4}
            hint={
              statusDescriptionRequired
                ? 'Required when the status is not changing from Pending to Active.'
                : 'Not required when activating a pending branch.'
            }
          />
          {statusError && <ErrorBanner message={statusError} />}
        </form>
      </FormDialog>
    </ListPageShell>
  );
}
