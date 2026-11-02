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
import { publicBusinessPath, publicBusinessUrl } from '@/lib/business-url';
import { AFGHANISTAN_CITIES } from '@/lib/cities';
import { CircleDot, Eye, ExternalLink, GitBranch, Pencil, Trash2 } from 'lucide-react';

export default function BusinessListPage() {
  const router = useRouter();
  const [items, setItems] = useState<BusinessRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const [selected, setSelected] = useState<BusinessRow | null>(null);
  const [showView, setShowView] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editSlugTouched, setEditSlugTouched] = useState(false);
  const [editDescription, setEditDescription] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editTagline, setEditTagline] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editCountry, setEditCountry] = useState('');
  const [editServices, setEditServices] = useState('');
  const [editWorkingHours, setEditWorkingHours] = useState('');
  const [editStatus, setEditStatus] = useState<BusinessStatus>('pending');

  const [showStatus, setShowStatus] = useState(false);
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [changeStatus, setChangeStatus] = useState<BusinessStatus>('pending');
  const [changeDescription, setChangeDescription] = useState('');
  const [origin, setOrigin] = useState('');

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const res = await fetch(`/api/businesses?type=central&_=${Date.now()}`, {
        cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load businesses');
      setItems(Array.isArray(data) ? data : []);
      setError(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load businesses';
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

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const filterFn = useCallback(
    (item: BusinessRow) => {
      const activeOk = !status || businessStatusFromRow(item) === status;
      const typeOk = !typeFilter || item.business_type_id === typeFilter || item.business_type_name === typeFilter;
      return activeOk && typeOk;
    },
    [status, typeFilter]
  );

  const list = useListQuery({
    items: items as (BusinessRow & Record<string, unknown>)[],
    searchKeys: [
      'name',
      'slug',
      'tenant_code',
      'email',
      'phone',
      'address',
      'business_type_name',
      'description',
      'description_text',
      'bio',
      'tagline',
      'website',
      'city',
      'country',
      'services',
    ],
    filterKey: `${status}|${typeFilter}`,
    filterFn: filterFn as (item: BusinessRow & Record<string, unknown>) => boolean,
  });

  const statusOptions = useMemo(
    () => BUSINESS_STATUSES.map((item) => ({ value: item.value, label: item.label })),
    []
  );

  const cityOptions = useMemo(
    () => AFGHANISTAN_CITIES.map((item) => ({ value: item.name, label: item.name })),
    []
  );

  const openView = (row: BusinessRow) => {
    setSelected(row);
    setShowView(true);
  };

  const openEdit = (row: BusinessRow) => {
    setSelected(row);
    setEditName(row.name || '');
    setEditSlug(row.slug || '');
    setEditSlugTouched(true);
    setEditDescription(row.description || '');
    setEditEmail(row.email || '');
    setEditPhone(row.phone || '');
    setEditAddress(row.address || '');
    setEditBio(row.bio || '');
    setEditTagline(row.tagline || '');
    setEditWebsite(row.website || '');
    setEditCity(row.city || '');
    setEditCountry(row.country || '');
    setEditServices((row.services || []).join(', '));
    setEditWorkingHours(row.working_hours_display || '');
    setEditStatus(businessStatusFromRow(row));
    setEditError(null);
    setShowEdit(true);
  };

  const onEditNameChange = (value: string) => {
    setEditName(value);
    if (!editSlugTouched) setEditSlug(toSlug(value));
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
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
          description: editDescription.trim() || null,
          email: editEmail.trim() || null,
          phone: editPhone.trim() || null,
          address: editAddress.trim() || null,
          bio: editBio.trim() || null,
          tagline: editTagline.trim() || null,
          website: editWebsite.trim() || null,
          city: editCity.trim() || null,
          country: editCountry.trim() || null,
          services: editServices,
          working_hours_display: editWorkingHours.trim() || null,
          status: editStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update business');
      toast.success('Business updated');
      setShowEdit(false);
      setSelected(null);
      await refreshPage();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update business';
      setEditError(message);
      toast.error(message);
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = async (row: BusinessRow) => {
    if (!confirm(`Delete business "${row.name}"? Remove its branches first.`)) return;
    try {
      const res = await fetch(`/api/businesses/${row.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to delete business');
      toast.success(`"${row.name}" deleted`);
      await refreshPage();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete business');
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
      if (changeDescription.trim()) {
        payload.description = changeDescription.trim();
      }
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

  const goAddBranch = (parent: BusinessRow) => {
    router.push(`/business/branches?business=${encodeURIComponent(parent.id)}&create=1`);
  };

  const typeOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of items) {
      const id = item.business_type_id || item.business_type_name;
      const label = item.business_type_name;
      if (id && label) map.set(id, label);
    }
    return [...map.entries()].map(([value, label]) => ({ value, label }));
  }, [items]);

  return (
    <ListPageShell
      title="Business Management"
      description="Create businesses and manage their branches"
      primaryAction={{
        label: 'Create Business',
        onClick: () => router.push('/business/create'),
      }}
      search={list.search}
      onSearchChange={list.setSearch}
      searchPlaceholder="Search businesses…"
      onResetFilters={() => {
        list.reset();
        setStatus('');
        setTypeFilter('');
      }}
      filters={[
        {
          key: 'type',
          label: 'Business type',
          value: typeFilter,
          options: typeOptions,
          onChange: setTypeFilter,
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
          header: 'Business',
          render: (r) => (
            <div>
              <div className="font-semibold">{r.name || '—'}</div>
              <div className="text-xs text-muted-foreground">{publicBusinessPath(r.slug)}</div>
            </div>
          ),
        },
        {
          key: 'business_type_name',
          header: 'Type',
          render: (r) => r.business_type_name || '—',
        },
        {
          key: 'tenant_code',
          header: 'Code',
          render: (r) => r.tenant_code || '—',
        },
        {
          key: 'public_url',
          header: 'Public URL',
          className: 'w-[16rem] max-w-[16rem]',
          render: (r) => {
            if (!r.slug) return '—';
            const url = publicBusinessUrl(r.slug, origin || undefined);
            return (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="block w-[16rem] max-w-[16rem] truncate text-[#88b6ff] hover:underline"
                title={url}
              >
                {url}
              </a>
            );
          },
        },
        {
          key: 'branch_count',
          header: 'Branches',
          render: (r) => Number(r.branch_count ?? 0),
        },
        {
          key: 'email',
          header: 'Contact',
          render: (r) => (
            <div className="text-sm">
              <div>{r.email || '—'}</div>
              <div className="text-xs text-muted-foreground">{r.phone || ''}</div>
            </div>
          ),
        },
        {
          key: 'plan',
          header: 'Plan',
          render: (r) => (r.plan || 'standard').toUpperCase(),
        },
        {
          key: 'description',
          header: 'Description',
          className: 'w-[11rem] max-w-[11rem]',
          render: (r) => {
            const notes = statusNotesFromRow(r);
            const latest = notes[notes.length - 1];
            if (!latest) return '—';
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
                  key: 'branch',
                  label: 'Add Branch',
                  icon: <GitBranch size={16} />,
                  onClick: () => goAddBranch(r),
                },
                {
                  key: 'open',
                  label: 'Open site',
                  icon: <ExternalLink size={16} />,
                  disabled: businessStatusFromRow(r) !== 'active',
                  onClick: () =>
                    window.open(publicBusinessPath(r.slug), '_blank', 'noopener,noreferrer'),
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
      emptyMessage="No businesses yet. Create your first business."
    >
      {error && <ErrorBanner message={error} />}
      <FormDialog
        open={showView && Boolean(selected)}
        title="Business details"
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
          <div className="space-y-4">
            {selected.logo_url && (
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selected.logo_url}
                  alt={`${selected.name} logo`}
                  className="h-14 w-14 rounded-xl border border-border object-cover"
                />
                <div>
                  <p className="text-lg font-semibold">{selected.name}</p>
                  <p className="text-sm text-muted-foreground">{selected.tenant_code || '—'}</p>
                </div>
              </div>
            )}
            {!selected.logo_url && (
              <div>
                <p className="text-lg font-semibold">{selected.name}</p>
                <p className="text-sm text-muted-foreground">{selected.tenant_code || '—'}</p>
              </div>
            )}
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Public URL</dt>
                <dd className="font-medium break-all">
                  {typeof window !== 'undefined'
                    ? publicBusinessUrl(selected.slug, window.location.origin)
                    : publicBusinessPath(selected.slug)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Type</dt>
                <dd className="font-medium">{selected.business_type_name || '—'}</dd>
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
                <dt className="text-muted-foreground">Plan</dt>
                <dd className="font-medium uppercase">{selected.plan || 'standard'}</dd>
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
              <div>
                <dt className="text-muted-foreground">Website</dt>
                <dd className="font-medium break-all">{selected.website || '—'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">City</dt>
                <dd className="font-medium">
                  {[selected.city, selected.country].filter(Boolean).join(', ') || '—'}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">Tagline</dt>
                <dd className="font-medium">{selected.tagline || '—'}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">Bio</dt>
                <dd className="font-medium whitespace-pre-wrap">{selected.bio || '—'}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">Services</dt>
                <dd className="font-medium">
                  {(selected.services || []).length ? selected.services?.join(', ') : '—'}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">Working hours</dt>
                <dd className="font-medium">{selected.working_hours_display || '—'}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">Description</dt>
                <dd className="space-y-1 font-medium">
                  {statusNotesFromRow(selected).length
                    ? statusNotesFromRow(selected).map((note, index) => (
                        <p key={`${note.at}-${index}`}>{note.text}</p>
                      ))
                    : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Branches</dt>
                <dd className="font-medium">{Number(selected.branch_count ?? 0)}</dd>
              </div>
            </dl>
          </div>
        )}
      </FormDialog>

      <FormDialog
        open={showEdit && Boolean(selected)}
        title={selected ? `Edit business · ${selected.name}` : 'Edit business'}
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
            formId="edit-business-form"
          />
        }
      >
        <form id="edit-business-form" onSubmit={handleEdit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <InputField
                label="Business name"
                required
                value={editName}
                onChange={(e) => onEditNameChange(e.target.value)}
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
              hint="Public URL for this business."
            />
            <InputField
              label="Business code"
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
            <InputField
              label="Website"
              type="url"
              value={editWebsite}
              onChange={(e) => setEditWebsite(e.target.value)}
            />
            <Dropdown
              label="City"
              value={editCity}
              onChange={setEditCity}
              options={cityOptions}
              placeholder="Select a city"
              filter
            />
            <InputField
              label="Country"
              value={editCountry}
              onChange={(e) => setEditCountry(e.target.value)}
            />
            <InputField
              label="Working hours"
              value={editWorkingHours}
              onChange={(e) => setEditWorkingHours(e.target.value)}
            />
            <Dropdown
              label="Status"
              value={editStatus}
              onChange={(value) => setEditStatus(value as BusinessStatus)}
              options={statusOptions}
            />
            <div className="sm:col-span-2">
              <InputField
                label="Tagline"
                value={editTagline}
                onChange={(e) => setEditTagline(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <TextAreaField
                label="Bio"
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                rows={5}
              />
            </div>
            <div className="sm:col-span-2">
              <TextAreaField
                label="Services"
                value={editServices}
                onChange={(e) => setEditServices(e.target.value)}
                rows={3}
                hint="Separate services with commas"
              />
            </div>
            <div className="sm:col-span-2">
              <TextAreaField
                label="Internal note"
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
            formId="change-status-form"
          />
        }
      >
        <form id="change-status-form" onSubmit={handleChangeStatus} className="space-y-4">
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
            hint="New businesses start as Pending. Set Active when the public site should go live."
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
                : 'Not required when activating a pending business.'
            }
          />
          {statusError && <ErrorBanner message={statusError} />}
        </form>
      </FormDialog>
    </ListPageShell>
  );
}
