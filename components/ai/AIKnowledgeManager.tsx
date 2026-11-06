'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { FileUp, RefreshCw } from 'lucide-react';
import {
  ConfirmDialog,
  DataTable,
  Dropdown,
  ErrorBanner,
  FieldLabel,
  FormDialog,
  FormDialogFooter,
  InputField,
  PortButton,
  RowActions,
  SectionPanel,
  StatusChip,
  TextAreaField,
  type DataColumn,
} from '@/components/ports';
import { AI_MODULES, AI_MODULE_LABELS } from '@/lib/ai/modules';

type Doc = {
  id: string;
  title: string;
  source_type: string;
  file_name: string | null;
  module: string | null;
  status: string;
  embedding_status: string;
  chunk_count: number;
  error: string | null;
  created_at: string;
};

const MODULE_OPTIONS = AI_MODULES.map((m) => ({ value: m, label: AI_MODULE_LABELS[m] }));
const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'dr', label: 'Dari' },
  { value: 'ps', label: 'Pashto' },
];

export default function AIKnowledgeManager({
  scope,
  title,
  description,
  allowBuiltinSync = false,
}: {
  scope: 'global' | 'organization';
  title: string;
  description: string;
  allowBuiltinSync?: boolean;
}) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<Doc | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [form, setForm] = useState({ title: '', module: '', language: '', text: '' });
  const [file, setFile] = useState<File | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ai/knowledge?scope=${scope}`, { cache: 'no-store' });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || 'Failed to load documents');
      setDocs(json.data as Doc[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    void load();
  }, [load]);

  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const body = new FormData();
      body.set('scope', scope);
      body.set('title', form.title);
      if (form.module) body.set('module', form.module);
      if (form.language) body.set('language', form.language);
      if (file) body.set('file', file);
      else body.set('text', form.text);
      const res = await fetch('/api/ai/knowledge', { method: 'POST', body });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || 'Upload failed');
      setOpen(false);
      setForm({ title: '', module: '', language: '', text: '' });
      setFile(null);
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setSubmitting(true);
    const res = await fetch(`/api/ai/knowledge/${deleting.id}?scope=${scope}`, { method: 'DELETE' });
    const json = await res.json().catch(() => null);
    setSubmitting(false);
    setDeleting(null);
    if (!res.ok) setError(json?.error || 'Delete failed');
    void load();
  };

  const syncBuiltin = async () => {
    setSyncing(true);
    setError(null);
    const res = await fetch('/api/ai/knowledge/sync-builtin', { method: 'POST' });
    const json = await res.json().catch(() => null);
    setSyncing(false);
    if (!res.ok) setError(json?.error || 'Sync failed');
    void load();
  };

  const columns: DataColumn<Doc>[] = [
    {
      key: 'title',
      header: 'Document',
      render: (d) => (
        <div className="max-w-[320px]">
          <p className="truncate font-medium" dir="auto">
            {d.title}
          </p>
          <p className="truncate text-xs text-muted-foreground">{d.file_name || d.source_type}</p>
        </div>
      ),
    },
    { key: 'module', header: 'Module', render: (d) => (d.module ? AI_MODULE_LABELS[d.module as keyof typeof AI_MODULE_LABELS] ?? d.module : '—') },
    {
      key: 'status',
      header: 'Status',
      render: (d) => (
        <StatusChip label={d.status} tone={d.status === 'ready' ? 'green' : d.status === 'failed' ? 'gold' : 'blue'} />
      ),
    },
    {
      key: 'embedding',
      header: 'Search',
      render: (d) => (
        <span title={d.error ?? undefined}>
          <StatusChip
            label={d.embedding_status === 'ready' ? 'Semantic' : d.status === 'ready' ? 'Keyword only' : d.embedding_status}
            tone={d.embedding_status === 'ready' ? 'green' : 'gray'}
          />
        </span>
      ),
    },
    { key: 'chunks', header: 'Chunks', align: 'right', render: (d) => d.chunk_count },
    { key: 'created', header: 'Added', render: (d) => new Date(d.created_at).toLocaleDateString() },
    { key: 'actions', header: '', align: 'right', render: (d) => <RowActions onDelete={() => setDeleting(d)} /> },
  ];

  return (
    <SectionPanel
      title={title}
      description={description}
      headerRight={
        <div className="flex flex-wrap gap-2">
          {allowBuiltinSync && (
            <PortButton variant="secondary" onClick={syncBuiltin} disabled={syncing}>
              <RefreshCw size={15} className={syncing ? 'animate-spin' : undefined} />
              {syncing ? 'Indexing…' : 'Re-index built-in guides'}
            </PortButton>
          )}
          <PortButton variant="primary" onClick={() => setOpen(true)}>
            <FileUp size={15} />
            Add document
          </PortButton>
        </div>
      }
      bodyClassName="space-y-3 p-0"
    >
      {error && (
        <div className="px-4 pt-4">
          <ErrorBanner message={error} />
        </div>
      )}
      <DataTable
        columns={columns}
        rows={docs}
        rowKey={(d) => d.id}
        loading={loading}
        emptyMessage="No documents yet. Built-in DreamFlow guides are always available to the assistant."
      />

      <FormDialog
        open={open}
        title="Add knowledge document"
        onClose={() => setOpen(false)}
        maxWidth="lg"
        footer={
          <FormDialogFooter
            onCancel={() => setOpen(false)}
            submitLabel="Upload"
            submitting={submitting}
            disabled={!form.title.trim() && !file}
            formId="ai-knowledge-form"
          />
        }
      >
        <form id="ai-knowledge-form" className="space-y-4" onSubmit={upload}>
          <InputField
            label="Title"
            value={form.title}
            maxLength={200}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            hint="Defaults to the file name when a file is uploaded."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Dropdown
              label="Module"
              value={form.module}
              onChange={(v) => setForm((f) => ({ ...f, module: v }))}
              options={MODULE_OPTIONS}
              placeholder="General"
              clearable
            />
            <Dropdown
              label="Language"
              value={form.language}
              onChange={(v) => setForm((f) => ({ ...f, language: v }))}
              options={LANGUAGE_OPTIONS}
              placeholder="Any"
              clearable
            />
          </div>
          <div className="space-y-1.5">
            <FieldLabel htmlFor="ai-knowledge-file">File (PDF, TXT, Markdown, CSV, JSON — max 10 MB)</FieldLabel>
            <input
              id="ai-knowledge-file"
              type="file"
              accept=".pdf,.txt,.md,.markdown,.csv,.json,application/pdf,text/plain,text/markdown,text/csv,application/json"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-muted-foreground file:me-3 file:rounded-[7px] file:border file:border-border file:bg-card file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-muted"
            />
          </div>
          {!file && (
            <TextAreaField
              label="Or paste text"
              value={form.text}
              rows={6}
              dir="auto"
              onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
              hint="Policies, procedures, or FAQs. Do not include passwords or personal data."
            />
          )}
        </form>
      </FormDialog>

      <ConfirmDialog
        open={!!deleting}
        title="Delete document"
        message={`"${deleting?.title ?? ''}" will no longer be used by the assistant.`}
        submitting={submitting}
        onConfirm={remove}
        onClose={() => setDeleting(null)}
      />
    </SectionPanel>
  );
}
