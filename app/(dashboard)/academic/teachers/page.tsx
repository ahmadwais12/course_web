'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ErrorBanner,
  ListPageShell,
  StatCard,
  StatusChip,
  statusToneFromValue,
} from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import { useListQuery } from '@/hooks/useListQuery';
import { dateLabel } from '@/lib/display';

type TeacherRow = {
  id: string;
  profileId: string | null;
  code: string;
  name: string;
  email: string | null;
  phone: string | null;
  department: string;
  qualification: string | null;
  specialization: string | null;
  experienceYears: number;
  joinDate: string | null;
  status: string;
  workloadHours: number;
  subjects: number;
  classes: number;
  source: 'teacher_profile' | 'user_profile';
};

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'on_leave', label: 'On leave' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'resigned', label: 'Resigned' },
  { value: 'terminated', label: 'Terminated' },
];

export default function AcademicTeachersPage() {
  const [rows, setRows] = useState<TeacherRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [department, setDepartment] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/academic/teachers');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load teachers');
      setRows(Array.isArray(data.rows) ? data.rows : []);
      setError(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load teachers';
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

  const departments = useMemo(
    () =>
      [...new Set(rows.map((row) => row.department).filter((value) => value && value !== '—'))]
        .sort()
        .map((value) => ({ value, label: value })),
    [rows]
  );

  const list = useListQuery({
    items: rows as (TeacherRow & Record<string, unknown>)[],
    searchKeys: ['name', 'code', 'email', 'department', 'specialization'],
    filterKey: `${status}|${department}`,
    filterFn: (row) =>
      (!status || row.status === status) && (!department || row.department === department),
  });

  const stats = useMemo(
    () => ({
      total: rows.length,
      active: rows.filter((row) => row.status === 'active').length,
      workload: rows.reduce((sum, row) => sum + row.workloadHours, 0),
      unassigned: rows.filter((row) => row.classes === 0).length,
    }),
    [rows]
  );

  return (
    <ListPageShell
      title="Teachers"
      description="Teaching staff with department, qualification, workload, and class load."
      search={list.search}
      onSearchChange={list.setSearch}
      searchPlaceholder="Search teacher, code, email, or specialization…"
      onResetFilters={() => {
        list.reset();
        setStatus('');
        setDepartment('');
      }}
      filters={[
        { key: 'status', label: 'Status', value: status, options: STATUS_OPTIONS, onChange: setStatus },
        { key: 'department', label: 'Department', value: department, options: departments, onChange: setDepartment },
      ]}
      loading={loading}
      columns={[
        {
          key: 'name',
          header: 'Teacher',
          render: (row) => (
            <div>
              <div className="font-semibold">{row.name}</div>
              <div className="text-xs text-muted-foreground">
                {row.code !== '—' ? row.code : row.email || 'Profile only'}
              </div>
            </div>
          ),
        },
        { key: 'department', header: 'Department', render: (row) => row.department },
        {
          key: 'specialization',
          header: 'Specialization',
          render: (row) => row.specialization || row.qualification || '—',
        },
        {
          key: 'experience',
          header: 'Experience',
          align: 'center',
          render: (row) => (row.experienceYears ? `${row.experienceYears} yrs` : '—'),
        },
        {
          key: 'classes',
          header: 'Classes / subjects',
          align: 'center',
          render: (row) => `${row.classes} / ${row.subjects}`,
        },
        { key: 'workload', header: 'Weekly hours', align: 'center', render: (row) => row.workloadHours },
        {
          key: 'joinDate',
          header: 'Joined',
          render: (row) => (row.joinDate ? dateLabel(row.joinDate) : '—'),
        },
        {
          key: 'status',
          header: 'Status',
          render: (row) => (
            <StatusChip label={row.status.replaceAll('_', ' ')} tone={statusToneFromValue(row.status)} />
          ),
        },
      ]}
      rows={list.rows as TeacherRow[]}
      rowKey={(row) => row.id}
      page={list.page}
      perPage={list.perPage}
      total={list.total}
      onPageChange={list.setPage}
      onPerPageChange={list.setPerPage}
      emptyMessage="No teachers found yet."
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Teachers" value={stats.total} accent="blue" />
        <StatCard label="Active" value={stats.active} accent="green" />
        <StatCard label="Weekly workload" value={stats.workload} accent="gold" />
        <StatCard label="No class assigned" value={stats.unassigned} accent="purple" />
      </div>
      {error && <ErrorBanner message={error} />}
    </ListPageShell>
  );
}
