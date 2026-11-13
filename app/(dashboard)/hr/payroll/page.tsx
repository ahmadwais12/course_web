'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ConfirmDialog,
  ErrorBanner,
  ListPageShell,
  RowActions,
  SectionPanel,
  StatCard,
  StatusChip,
  statusToneFromValue,
} from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import { useListQuery } from '@/hooks/useListQuery';
import { dateLabel, money, monthKeyLabel } from '@/lib/display';
import { CheckCircle2, RotateCcw, Trash2 } from 'lucide-react';

type PayrollRow = {
  id: string;
  employeeName: string;
  employeeCode: string | null;
  employeeType: string;
  period: string;
  periodKey: string;
  basicSalary: number;
  allowances: number;
  deductions: number;
  bonus: number;
  overtimePay: number;
  grossSalary: number;
  netSalary: number;
  paymentDate: string | null;
  paymentMethod: string | null;
  status: string;
};

type PayrollRun = {
  id: string;
  name: string;
  payrollPeriod: string | null;
  payDate: string | null;
  status: string;
  employeeCount: number;
  totalNet: number;
};

type Summary = {
  currentPeriod: string;
  currentPeriodLabel: string;
  netPayroll: number;
  headcount: number;
  pending: number;
  paid: number;
  totalPaid: number;
};

export default function HrPayrollPage() {
  const [rows, setRows] = useState<PayrollRow[]>([]);
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [periods, setPeriods] = useState<string[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('');
  const [status, setStatus] = useState('');
  const [employeeType, setEmployeeType] = useState('');
  const [deleting, setDeleting] = useState<PayrollRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hr/payroll');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load payroll');
      setRows(Array.isArray(data.rows) ? data.rows : []);
      setRuns(Array.isArray(data.runs) ? data.runs : []);
      setPeriods(Array.isArray(data.periods) ? data.periods : []);
      setSummary(data.summary ?? null);
      setError(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load payroll';
      setRows([]);
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const changeStatus = async (row: PayrollRow, nextStatus: string) => {
    setBusyId(row.id);
    try {
      const res = await fetch(`/api/hr/payroll/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to update payslip');
      toast.success(`Payslip marked ${nextStatus}`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update payslip');
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setWorking(true);
    try {
      const res = await fetch(`/api/hr/payroll/${deleting.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to delete payslip');
      toast.success('Payslip deleted');
      setDeleting(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete payslip');
    } finally {
      setWorking(false);
    }
  };

  const filterFn = useCallback(
    (row: PayrollRow) =>
      (!period || row.periodKey === period) &&
      (!status || row.status === status) &&
      (!employeeType || row.employeeType.toLowerCase() === employeeType),
    [period, status, employeeType]
  );

  const list = useListQuery({
    items: rows as (PayrollRow & Record<string, unknown>)[],
    searchKeys: ['employeeName', 'employeeCode', 'period', 'status'],
    filterKey: `${period}|${status}|${employeeType}`,
    filterFn: filterFn as (row: PayrollRow & Record<string, unknown>) => boolean,
  });

  const periodOptions = useMemo(
    () => periods.map((value) => ({ value, label: monthKeyLabel(value) })),
    [periods]
  );

  return (
    <>
    <ListPageShell
      title="Payroll"
      description="Monthly salary register with gross pay, deductions, and payslip status"
      search={list.search}
      onSearchChange={list.setSearch}
      searchPlaceholder="Search employee, code, or period…"
      onResetFilters={() => {
        list.reset();
        setPeriod('');
        setStatus('');
        setEmployeeType('');
      }}
      filters={[
        {
          key: 'period',
          label: 'Period',
          value: period,
          options: periodOptions,
          onChange: setPeriod,
        },
        {
          key: 'status',
          label: 'Status',
          value: status,
          options: [
            { value: 'pending', label: 'Pending' },
            { value: 'processed', label: 'Processed' },
            { value: 'paid', label: 'Paid' },
            { value: 'cancelled', label: 'Cancelled' },
          ],
          onChange: setStatus,
        },
        {
          key: 'employee_type',
          label: 'Employee type',
          value: employeeType,
          options: [
            { value: 'teacher', label: 'Teachers' },
            { value: 'staff', label: 'Staff' },
          ],
          onChange: setEmployeeType,
        },
      ]}
      loading={loading}
      columns={[
        {
          key: 'employeeName',
          header: 'Employee',
          render: (row) => (
            <div>
              <div className="font-semibold">{row.employeeName}</div>
              <div className="text-xs text-muted-foreground">
                {[row.employeeCode, row.employeeType].filter(Boolean).join(' · ')}
              </div>
            </div>
          ),
        },
        { key: 'period', header: 'Period' },
        {
          key: 'grossSalary',
          header: 'Gross',
          align: 'right',
          render: (row) => (
            <div>
              <div>{money(row.grossSalary || row.basicSalary + row.allowances + row.bonus + row.overtimePay)}</div>
              <div className="text-[11px] text-muted-foreground">
                Basic {money(row.basicSalary)} · Allow. {money(row.allowances)}
              </div>
            </div>
          ),
        },
        {
          key: 'deductions',
          header: 'Deductions',
          align: 'right',
          render: (row) => money(row.deductions),
        },
        {
          key: 'netSalary',
          header: 'Net pay',
          align: 'right',
          render: (row) => <span className="font-semibold">{money(row.netSalary)}</span>,
        },
        {
          key: 'paymentDate',
          header: 'Paid on',
          render: (row) => (
            <div>
              <div>{dateLabel(row.paymentDate)}</div>
              {row.paymentMethod && (
                <div className="text-[11px] capitalize text-muted-foreground">
                  {row.paymentMethod.replaceAll('_', ' ')}
                </div>
              )}
            </div>
          ),
        },
        {
          key: 'status',
          header: 'Status',
          render: (row) => (
            <StatusChip label={row.status} tone={statusToneFromValue(row.status)} />
          ),
        },
        {
          key: 'actions',
          header: 'Actions',
          align: 'right',
          render: (row) => (
            <RowActions
              overflow={[
                {
                  key: 'paid',
                  label: 'Mark paid',
                  icon: <CheckCircle2 size={16} />,
                  onClick: () => void changeStatus(row, 'paid'),
                  disabled: busyId === row.id || row.status === 'paid' || row.status === 'cancelled',
                },
                {
                  key: 'pending',
                  label: 'Set pending',
                  icon: <RotateCcw size={16} />,
                  onClick: () => void changeStatus(row, 'pending'),
                  disabled: busyId === row.id || row.status === 'pending',
                },
                {
                  key: 'delete',
                  label: 'Delete payslip',
                  icon: <Trash2 size={16} />,
                  onClick: () => setDeleting(row),
                  danger: true,
                },
              ]}
            />
          ),
        },
      ]}
      rows={list.rows as PayrollRow[]}
      rowKey={(row) => row.id}
      page={list.page}
      perPage={list.perPage}
      total={list.total}
      onPageChange={list.setPage}
      onPerPageChange={list.setPerPage}
      emptyMessage="No payroll rows yet."
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label={`Net payroll · ${summary?.currentPeriodLabel ?? 'latest'}`}
          value={summary ? money(summary.netPayroll) : '—'}
          accent="blue"
        />
        <StatCard label="Employees on payroll" value={summary?.headcount ?? 0} accent="purple" />
        <StatCard label="Pending payslips" value={summary?.pending ?? 0} accent="gold" />
        <StatCard
          label="Total paid"
          value={summary ? money(summary.totalPaid) : '—'}
          hint={summary ? `${summary.paid} paid payslips` : undefined}
          accent="green"
        />
      </div>

      {runs.length > 0 && (
        <SectionPanel title="Payroll runs" description="Processed payroll batches for this institute.">
          <div className="space-y-2">
            {runs.map((run) => (
              <div
                key={run.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-background px-3 py-2.5"
              >
                <div>
                  <p className="text-sm font-semibold">{run.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {run.payrollPeriod || '—'} · {run.employeeCount} employees · paid {dateLabel(run.payDate)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold">{money(run.totalNet)}</span>
                  <StatusChip label={run.status} tone={statusToneFromValue(run.status)} />
                </div>
              </div>
            ))}
          </div>
        </SectionPanel>
      )}

      {error && <ErrorBanner message={error} />}
    </ListPageShell>
    <ConfirmDialog
      open={Boolean(deleting)}
      title="Delete payslip"
      message={`Delete the ${deleting?.period ?? ''} payslip for ${deleting?.employeeName ?? 'this employee'}? This cannot be undone.`}
      submitting={working}
      onConfirm={() => void confirmDelete()}
      onClose={() => setDeleting(null)}
    />
    </>
  );
}
