'use client';

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import {
  DataTable,
  Dropdown,
  FormDialog,
  FormDialogFooter,
  PageHeader,
  PortButton,
  SectionPanel,
  StatCard,
  StatusChip,
  TextAreaField,
  statusToneFromValue,
  type DataColumn,
} from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import { PortalError, PortalLoading, formatDate } from '@/components/portal/PortalUi';
import { usePortalEndpoint } from '@/components/portal/usePortalEndpoint';
import type { PortalDocumentRequest } from '@/lib/portal-types';

const DOCUMENT_TYPES = [
  'Employment letter',
  'Salary certificate',
  'Experience letter',
  'Employment contract copy',
  'Tax certificate',
  'Bank verification letter',
  'ID card copy',
  'Other',
];

export function EmployeeDocumentRequestsScreen() {
  const { data, loading, error, refresh } = usePortalEndpoint<{ requests: PortalDocumentRequest[] }>(
    '/api/portal/employee/document-requests'
  );
  const [open, setOpen] = useState(false);
  const [documentType, setDocumentType] = useState('Employment letter');
  const [purpose, setPurpose] = useState('');
  const [saving, setSaving] = useState(false);

  const requests = data?.requests ?? [];
  const pending = requests.filter((row) => (row.status || 'pending') === 'pending').length;
  const approved = requests.filter((row) => row.status === 'approved').length;
  const issued = requests.filter((row) => row.status === 'issued' || row.issuedAt).length;

  const reset = () => {
    setOpen(false);
    setDocumentType('Employment letter');
    setPurpose('');
  };

  const submit = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/portal/employee/document-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentType, purpose }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || 'Request could not be submitted');
      toast.success('Document requested', {
        description: 'HR will review your request and issue the document.',
      });
      reset();
      refresh();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Request could not be submitted');
    } finally {
      setSaving(false);
    }
  };

  const columns: DataColumn<PortalDocumentRequest>[] = [
    {
      key: 'document',
      header: 'Document',
      render: (row) => (
        <div className="min-w-[200px]">
          <p className="font-semibold">{row.documentType}</p>
          <p className="text-[11px] text-muted-foreground">{row.purpose || 'No purpose provided'}</p>
        </div>
      ),
    },
    { key: 'requested', header: 'Requested', render: (row) => formatDate(row.createdAt) },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <StatusChip label={row.status || 'pending'} tone={statusToneFromValue(row.status || 'pending')} />
      ),
    },
    { key: 'approved', header: 'Approved', render: (row) => formatDate(row.approvedAt) },
    { key: 'issued', header: 'Issued', render: (row) => formatDate(row.issuedAt) },
    {
      key: 'notes',
      header: 'HR note',
      render: (row) => (
        <span className="block max-w-[220px] truncate" title={row.notes || ''}>
          {row.notes || '—'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4 p-1">
      <PageHeader
        title="Document Requests"
        description="Request employment letters and HR documents, then track their progress."
        actions={
          <PortButton variant="primary" onClick={() => setOpen(true)}>
            <Plus size={15} /> Request document
          </PortButton>
        }
      />
      {loading || error ? (
        error ? <PortalError message={error} onRetry={refresh} /> : <PortalLoading />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Requests" value={requests.length} accent="blue" />
            <StatCard label="Pending" value={pending} accent="gold" />
            <StatCard label="Approved" value={approved} accent="green" />
            <StatCard label="Issued" value={issued} accent="purple" />
          </div>

          <SectionPanel
            title="My requests"
            description="HR reviews each request and records the decision here."
          >
            <DataTable
              columns={columns}
              rows={requests}
              rowKey={(row) => row.id}
              emptyMessage="You have not requested any HR documents yet."
            />
          </SectionPanel>

          <FormDialog
            open={open}
            title="Request a document"
            onClose={reset}
            footer={
              <FormDialogFooter
                onCancel={reset}
                submitLabel="Submit request"
                submitting={saving}
                formId="document-request-form"
                disabled={!documentType}
              />
            }
          >
            <form
              id="document-request-form"
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                void submit();
              }}
            >
              <Dropdown
                label="Document"
                required
                value={documentType}
                onChange={setDocumentType}
                options={DOCUMENT_TYPES.map((value) => ({ value, label: value }))}
              />
              <TextAreaField
                label="Purpose"
                rows={3}
                value={purpose}
                onChange={(event) => setPurpose(event.target.value)}
                placeholder="Where the document is needed (visa, bank, university…)"
              />
              <p className="rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                Requests are processed by HR. You will see the decision in the table above once it
                is reviewed.
              </p>
            </form>
          </FormDialog>
        </>
      )}
    </div>
  );
}
