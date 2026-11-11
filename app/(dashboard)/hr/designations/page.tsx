'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ErrorBanner, ListPageShell, StatCard } from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import { useListQuery } from '@/hooks/useListQuery';
import { money } from '@/lib/display';

type DesignationRow = {
  id: string;
  designation: string;
  headcount: number;
  teacherCount: number;
  staffCount: number;
  departments: string[];
  averageSalary: number;
  minSalary: number;
  maxSalary: number;
  activeCount: number;
};

type Summary = {
  designations: number;
  headcount: number;
  departments: number;
  averageSalary: number;
};

export default function HrDesignationsPage() {
  const [rows, setRows] = useState<DesignationRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [department, setDepartment] = useState('');
  const [audience, setAudience] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/hr/designations');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load designations');
        if (!cancelled) {
          setRows(Array.isArray(data.rows) ? data.rows : []);
          setSummary(data.summary ?? null);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          const message = e instanceof Error ? e.message : 'Failed to load designations';
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
    (row: DesignationRow) =>
      (!department || row.departments.includes(department)) &&
      (!audience ||
        (audience === 'teachers' && row.teacherCount > 0) ||
        (audience === 'staff' && row.staffCount > 0)),
    [department, audience]
  );

  const list = useListQuery({
    items: rows as (DesignationRow & Record<string, unknown>)[],
    searchKeys: ['designation', 'departments'],
    filterKey: `${department}|${audience}`,
    filterFn: filterFn as (row: DesignationRow & Record<string, unknown>) => boolean,
  });

  const departmentOptions = useMemo(() => {
    const set = new Set(rows.flatMap((row) => row.departments));
    return [...set].sort().map((value) => ({ value, label: value }));
  }, [rows]);

  return (
    <ListPageShell
      title="Designations"
      description="Job titles across the institute with headcount and salary bands"
      search={list.search}
      onSearchChange={list.setSearch}
      searchPlaceholder="Search designation or department…"
      onResetFilters={() => {
        list.reset();
        setDepartment('');
        setAudience('');
      }}
      filters={[
        {
          key: 'department',
          label: 'Department',
          value: department,
          options: departmentOptions,
          onChange: setDepartment,
        },
        {
          key: 'audience',
          label: 'Audience',
          value: audience,
          options: [
            { value: 'teachers', label: 'Teaching' },
            { value: 'staff', label: 'Non-teaching' },
          ],
          onChange: setAudience,
        },
      ]}
      loading={loading}
      columns={[
        {
          key: 'designation',
          header: 'Designation',
          render: (row) => (
            <div>
              <div className="font-semibold">{row.designation}</div>
              <div className="text-xs text-muted-foreground">
                {row.activeCount} active of {row.headcount}
              </div>
            </div>
          ),
        },
        {
          key: 'breakdown',
          header: 'Breakdown',
          render: (row) => (
            <span className="text-xs text-muted-foreground">
              {row.teacherCount} teaching · {row.staffCount} non-teaching
            </span>
          ),
        },
        {
          key: 'departments',
          header: 'Departments',
          render: (row) => (
            <span
              className="block max-w-[220px] truncate"
              title={row.departments.join(', ')}
            >
              {row.departments.length ? row.departments.join(', ') : '—'}
            </span>
          ),
        },
        { key: 'headcount', header: 'Headcount', align: 'right' },
        {
          key: 'averageSalary',
          header: 'Avg salary',
          align: 'right',
          render: (row) => (row.averageSalary ? money(row.averageSalary) : '—'),
        },
        {
          key: 'range',
          header: 'Salary band',
          align: 'right',
          render: (row) =>
            row.minSalary || row.maxSalary
              ? `${money(row.minSalary)} – ${money(row.maxSalary)}`
              : '—',
        },
      ]}
      rows={list.rows as DesignationRow[]}
      rowKey={(row) => row.id}
      page={list.page}
      perPage={list.perPage}
      total={list.total}
      onPageChange={list.setPage}
      onPerPageChange={list.setPerPage}
      emptyMessage="No designations yet. Assign a designation to staff records first."
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Designations" value={summary?.designations ?? 0} accent="blue" />
        <StatCard label="Headcount" value={summary?.headcount ?? 0} accent="green" />
        <StatCard label="Departments" value={summary?.departments ?? 0} accent="purple" />
        <StatCard
          label="Average salary"
          value={summary ? money(summary.averageSalary) : '—'}
          accent="gold"
        />
      </div>
      {error && <ErrorBanner message={error} />}
    </ListPageShell>
  );
}
