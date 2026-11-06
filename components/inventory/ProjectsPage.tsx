'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Eye } from 'lucide-react';
import {
  ConfirmDialog,
  DetailDialog,
  Dropdown,
  ErrorBanner,
  FormDialog,
  FormDialogFooter,
  InputField,
  ListPageShell,
  RowActions,
  StatusChip,
  TextAreaField,
} from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import { useListQuery } from '@/hooks/useListQuery';
import { PROJECT_STATUSES } from '@/lib/asset-options';

type Project = {
  id: string;
  project_title: string;
  donar_name: string;
  project_description: string;
  project_objective: string;
  start_date: string;
  end_date: string;
  project_status: string;
  project_manager: string;
  project_stekeholder: string;
  project_budge: number | null;
  project_note: string;
};

const blank = {
  project_title: '',
  donar_name: '',
  project_description: '',
  project_objective: '',
  start_date: '',
  end_date: '',
  project_status: 'Planned',
  project_manager: '',
  project_stekeholder: '',
  project_budge: '',
  project_note: '',
};

export default function ProjectsPage() {
  const [items, setItems] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Project | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Project | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/inventory/projects');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load projects');
      setItems(Array.isArray(data) ? data : []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const list = useListQuery({
    items: items as (Project & Record<string, unknown>)[],
    searchKeys: ['project_title', 'donar_name', 'project_status', 'project_manager'],
  });

  const save = async () => {
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch(editing ? `/api/inventory/projects/${editing.id}` : '/api/inventory/projects', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, project_budge: form.project_budge === '' ? null : Number(form.project_budge) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      toast.success(editing ? 'Project updated' : 'Project created');
      setOpen(false);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: Project) => {
    const res = await fetch(`/api/inventory/projects/${row.id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.error || 'Delete failed');
      return;
    }
    toast.success('Project deleted');
    await load();
  };

  return (
    <>
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}
      <ListPageShell
        title="Projects"
        description="Projects linked to fixed assets, with donor, dates, status, and budget."
        primaryAction={{
          label: 'New project',
          onClick: () => {
            setEditing(null);
            setForm(blank);
            setFormError(null);
            setOpen(true);
          },
        }}
        search={list.search}
        onSearchChange={list.setSearch}
        columns={[
          { key: 'project_title', header: 'Project' },
          { key: 'donar_name', header: 'Donor', render: (row) => row.donar_name || '—' },
          {
            key: 'project_status',
            header: 'Status',
            render: (row) => <StatusChip label={String(row.project_status)} tone="blue" />,
          },
          { key: 'start_date', header: 'Start', render: (row) => row.start_date || '—' },
          { key: 'end_date', header: 'End', render: (row) => row.end_date || '—' },
          { key: 'project_budge', header: 'Budget', render: (row) => (row.project_budge == null ? '—' : String(row.project_budge)) },
          {
            key: 'actions',
            header: 'Actions',
            align: 'right',
            render: (row) => (
              <div className="flex justify-end">
                <RowActions
                  onEdit={() => {
                    const project = row as Project;
                    setEditing(project);
                    setForm({
                      project_title: project.project_title,
                      donar_name: project.donar_name,
                      project_description: project.project_description,
                      project_objective: project.project_objective,
                      start_date: project.start_date,
                      end_date: project.end_date,
                      project_status: project.project_status,
                      project_manager: project.project_manager,
                      project_stekeholder: project.project_stekeholder,
                      project_budge: project.project_budge == null ? '' : String(project.project_budge),
                      project_note: project.project_note,
                    });
                    setOpen(true);
                  }}
                  items={[{ key: 'view', label: 'Details', icon: <Eye size={16} />, onClick: () => setViewing(row as Project) }]}
                  onDelete={() => setPendingDelete(row as Project)}
                />
              </div>
            ),
          },
        ]}
        rows={list.rows}
        rowKey={(row) => String(row.id)}
        loading={loading}
        emptyMessage="No projects yet."
        page={list.page}
        perPage={list.perPage}
        total={list.total}
        onPageChange={list.setPage}
        onPerPageChange={list.setPerPage}
      />
      <FormDialog
        open={open}
        title={editing ? 'Edit project' : 'New project'}
        onClose={() => setOpen(false)}
        maxWidth="xl"
        footer={<FormDialogFooter onCancel={() => setOpen(false)} submitLabel="Save" submitting={saving} formId="project-form" />}
      >
        <form
          id="project-form"
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          {formError && (
            <div className="sm:col-span-2">
              <ErrorBanner message={formError} />
            </div>
          )}
          <InputField label="Title" value={form.project_title} onChange={(e) => setForm({ ...form, project_title: e.target.value })} required />
          <InputField label="Donor" value={form.donar_name} onChange={(e) => setForm({ ...form, donar_name: e.target.value })} />
          <Dropdown
            label="Status"
            value={form.project_status}
            onChange={(value) => setForm({ ...form, project_status: value })}
            options={PROJECT_STATUSES.map((status) => ({ value: status, label: status }))}
          />
          <InputField label="Budget" type="number" min={0} value={form.project_budge} onChange={(e) => setForm({ ...form, project_budge: e.target.value })} />
          <InputField label="Start" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
          <InputField label="End" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
          <InputField label="Manager" value={form.project_manager} onChange={(e) => setForm({ ...form, project_manager: e.target.value })} />
          <InputField label="Stakeholder" value={form.project_stekeholder} onChange={(e) => setForm({ ...form, project_stekeholder: e.target.value })} />
          <div className="sm:col-span-2">
            <TextAreaField label="Description" value={form.project_description} onChange={(e) => setForm({ ...form, project_description: e.target.value })} rows={3} />
          </div>
          <div className="sm:col-span-2">
            <TextAreaField label="Objective" value={form.project_objective} onChange={(e) => setForm({ ...form, project_objective: e.target.value })} rows={2} />
          </div>
          <div className="sm:col-span-2">
            <TextAreaField label="Note" value={form.project_note} onChange={(e) => setForm({ ...form, project_note: e.target.value })} rows={2} />
          </div>
        </form>
      </FormDialog>
      <DetailDialog
        open={Boolean(viewing)}
        title={viewing?.project_title || 'Project'}
        onClose={() => setViewing(null)}
        rows={
          viewing
            ? [
                { label: 'Donor', value: viewing.donar_name },
                { label: 'Status', value: viewing.project_status },
                { label: 'Budget', value: viewing.project_budge == null ? '' : String(viewing.project_budge) },
                { label: 'Start', value: viewing.start_date },
                { label: 'End', value: viewing.end_date },
                { label: 'Manager', value: viewing.project_manager },
                { label: 'Stakeholder', value: viewing.project_stekeholder },
                { label: 'Description', value: viewing.project_description },
                { label: 'Objective', value: viewing.project_objective },
                { label: 'Note', value: viewing.project_note },
              ]
            : []
        }
      />
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete project"
        message={pendingDelete ? `Delete ${pendingDelete.project_title}?` : ''}
        onClose={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (!pendingDelete) return;
          const row = pendingDelete;
          setPendingDelete(null);
          await remove(row);
        }}
      />
    </>
  );
}
