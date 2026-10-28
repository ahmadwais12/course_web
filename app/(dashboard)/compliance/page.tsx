'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ErrorBanner, ListPageShell, StatusChip, statusToneFromValue } from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import { useListQuery } from '@/hooks/useListQuery';

type DocumentRow = {
  id: string;
  student_name: string;
  student_code?: string | null;
  document_type?: string | null;
  issue_date?: string | null;
  expiry_date?: string | null;
  issued_by?: string | null;
  status: string;
};

export default function CompliancePage() {
  const [items, setItems] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/student-documents');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load documents');
        if (!cancelled) {
          setItems(Array.isArray(data) ? data : []);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          const message = e instanceof Error ? e.message : 'Failed to load documents';
          setItems([]);
          setError(message);
          toast.error(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filterFn = useCallback(
    (item: DocumentRow) => !status || item.status === status,
    [status]
  );

  const list = useListQuery({
    items: items as (DocumentRow & Record<string, unknown>)[],
    searchKeys: ['student_name', 'student_code', 'document_type', 'issued_by', 'status'],
    filterKey: status,
    filterFn: filterFn as (item: DocumentRow & Record<string, unknown>) => boolean,
  });

  const statusOptions = useMemo(() => {
    const set = new Set(items.map((i) => i.status).filter(Boolean));
    return [...set].map((s) => ({ value: s, label: s }));
  }, [items]);

  return (
    <ListPageShell
      title="Compliance"
      description="Student documents, expiry dates, and verification status"
      search={list.search}
      onSearchChange={list.setSearch}
      searchPlaceholder="Search student, document, or issuer…"
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
          key: 'student_name',
          header: 'Student',
          render: (r) => (
            <div>
              <div className="font-semibold">{r.student_name || '—'}</div>
              <div className="text-xs text-muted-foreground">{r.student_code}</div>
            </div>
          ),
        },
        { key: 'document_type', header: 'Document' },
        { key: 'issue_date', header: 'Issued' },
        { key: 'expiry_date', header: 'Expires' },
        { key: 'issued_by', header: 'Issued by' },
        {
          key: 'status',
          header: 'Verification',
          render: (r) => (
            <StatusChip label={r.status} tone={statusToneFromValue(r.status)} />
          ),
        },
      ]}
      rows={list.rows as DocumentRow[]}
      rowKey={(r) => r.id}
      page={list.page}
      perPage={list.perPage}
      total={list.total}
      onPageChange={list.setPage}
      onPerPageChange={list.setPerPage}
      emptyMessage="No student documents on record."
    >
      {error && <ErrorBanner message={error} />}
    </ListPageShell>
  );
}
