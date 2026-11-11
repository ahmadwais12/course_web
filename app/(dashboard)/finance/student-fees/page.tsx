'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ErrorBanner, ListPageShell, StatCard, StatusChip } from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import { useListQuery } from '@/hooks/useListQuery';
import { dateLabel, money } from '@/lib/display';

type StudentFeeRow = {
  id: string;
  studentName: string;
  studentCode: string | null;
  className: string | null;
  programName: string | null;
  totalFees: number;
  paidAmount: number;
  outstanding: number;
  invoiceCount: number;
  paidInvoices: number;
  overdueInvoices: number;
  lastInvoiceDate: string | null;
  billingStatus: string;
  enrollmentStatus: string;
};

type Summary = {
  students: number;
  totalFees: number;
  totalPaid: number;
  outstanding: number;
  overdueStudents: number;
};

const STATUS_TONE: Record<string, 'green' | 'gold' | 'blue' | 'purple' | 'gray'> = {
  paid: 'green',
  partial: 'gold',
  unpaid: 'blue',
  overdue: 'purple',
  'no fees': 'gray',
};

export default function StudentFeesPage() {
  const [rows, setRows] = useState<StudentFeeRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [className, setClassName] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/finance/student-fees');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load student fees');
        if (!cancelled) {
          setRows(Array.isArray(data.rows) ? data.rows : []);
          setSummary(data.summary ?? null);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          const message = e instanceof Error ? e.message : 'Failed to load student fees';
          setRows([]);
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
    (row: StudentFeeRow) =>
      (!status || row.billingStatus === status) &&
      (!className || (row.className ?? 'Unassigned') === className),
    [status, className]
  );

  const list = useListQuery({
    items: rows as (StudentFeeRow & Record<string, unknown>)[],
    searchKeys: ['studentName', 'studentCode', 'className', 'programName'],
    filterKey: `${status}|${className}`,
    filterFn: filterFn as (row: StudentFeeRow & Record<string, unknown>) => boolean,
  });

  const classOptions = useMemo(() => {
    const set = new Set(rows.map((row) => row.className ?? 'Unassigned'));
    return [...set].sort().map((value) => ({ value, label: value }));
  }, [rows]);

  return (
    <ListPageShell
      title="Student Fees"
      description="Assigned fees, payments, and outstanding balances per student"
      search={list.search}
      onSearchChange={list.setSearch}
      searchPlaceholder="Search student, code, class, or program…"
      onResetFilters={() => {
        list.reset();
        setStatus('');
        setClassName('');
      }}
      filters={[
        {
          key: 'billing_status',
          label: 'Billing status',
          value: status,
          options: [
            { value: 'paid', label: 'Paid' },
            { value: 'partial', label: 'Partially paid' },
            { value: 'unpaid', label: 'Unpaid' },
            { value: 'overdue', label: 'Overdue' },
            { value: 'no fees', label: 'No fees' },
          ],
          onChange: setStatus,
        },
        {
          key: 'class',
          label: 'Class',
          value: className,
          options: classOptions,
          onChange: setClassName,
        },
      ]}
      loading={loading}
      columns={[
        {
          key: 'studentName',
          header: 'Student',
          render: (row) => (
            <div>
              <div className="font-semibold">{row.studentName}</div>
              <div className="text-xs text-muted-foreground">
                {[row.studentCode, row.className, row.programName].filter(Boolean).join(' · ')}
              </div>
            </div>
          ),
        },
        {
          key: 'totalFees',
          header: 'Total fees',
          align: 'right',
          render: (row) => money(row.totalFees),
        },
        {
          key: 'paidAmount',
          header: 'Paid',
          align: 'right',
          render: (row) => money(row.paidAmount),
        },
        {
          key: 'outstanding',
          header: 'Outstanding',
          align: 'right',
          render: (row) => (
            <span className={row.outstanding > 0 ? 'font-semibold' : undefined}>{money(row.outstanding)}</span>
          ),
        },
        {
          key: 'invoices',
          header: 'Invoices',
          align: 'right',
          render: (row) => (
            <div>
              <div>{row.invoiceCount}</div>
              <div className="text-[11px] text-muted-foreground">{row.paidInvoices} paid</div>
            </div>
          ),
        },
        {
          key: 'lastInvoiceDate',
          header: 'Last invoice',
          render: (row) => dateLabel(row.lastInvoiceDate),
        },
        {
          key: 'billingStatus',
          header: 'Status',
          render: (row) => (
            <StatusChip label={row.billingStatus} tone={STATUS_TONE[row.billingStatus] ?? 'blue'} />
          ),
        },
      ]}
      rows={list.rows as StudentFeeRow[]}
      rowKey={(row) => row.id}
      page={list.page}
      perPage={list.perPage}
      total={list.total}
      onPageChange={list.setPage}
      onPerPageChange={list.setPerPage}
      emptyMessage="No student fee records yet."
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Students billed" value={summary?.students ?? 0} accent="blue" />
        <StatCard label="Total billed" value={money(summary?.totalFees ?? 0)} accent="purple" />
        <StatCard label="Collected" value={money(summary?.totalPaid ?? 0)} accent="green" />
        <StatCard
          label="Outstanding"
          value={money(summary?.outstanding ?? 0)}
          hint={summary ? `${summary.overdueStudents} students overdue` : undefined}
          accent="gold"
        />
      </div>
      {error && <ErrorBanner message={error} />}
    </ListPageShell>
  );
}
