'use client';

import React, { useState } from 'react';
import { ListPageShell, StatusChip, statusToneFromValue } from '@/components/ports';
import { useListQuery } from '@/hooks/useListQuery';

type AttendanceRow = {
  id: string;
  student: string;
  course: string;
  date: string;
  status: string;
};

const DEMO: AttendanceRow[] = [
  { id: '1', student: 'Alice Johnson', course: 'IELTS', date: '2026-03-20', status: 'present' },
  { id: '2', student: 'Mark Smith', course: 'IELTS', date: '2026-03-20', status: 'absent' },
  { id: '3', student: 'Sarah Wilson', course: 'General English', date: '2026-03-19', status: 'late' },
  { id: '4', student: 'David Brown', course: 'TOEFL', date: '2026-03-19', status: 'present' },
  { id: '5', student: 'Emma Davis', course: 'IELTS', date: '2026-03-18', status: 'present' },
];

export default function AttendancePage() {
  const [status, setStatus] = useState('');
  const items = DEMO;

  const list = useListQuery({
    items: items as (AttendanceRow & Record<string, unknown>)[],
    searchKeys: ['student', 'course', 'status'],
    filterKey: status,
    filterFn: (item) => !status || item.status === status,
  });

  return (
      <ListPageShell
        title="Attendance"
        description="Daily attendance with search and filters"
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search student or course…"
        onResetFilters={() => {
          list.reset();
          setStatus('');
        }}
        filters={[
          {
            key: 'status',
            label: 'Status',
            value: status,
            options: [
              { value: 'present', label: 'Present' },
              { value: 'absent', label: 'Absent' },
              { value: 'late', label: 'Late' },
            ],
            onChange: setStatus,
          },
        ]}
        columns={[
          { key: 'student', header: 'Student' },
          { key: 'course', header: 'Course' },
          { key: 'date', header: 'Date' },
          {
            key: 'status',
            header: 'Status',
            render: (r) => (
              <StatusChip
                label={r.status}
                tone={statusToneFromValue(r.status === 'present' ? 'completed' : r.status === 'absent' ? 'failed' : 'pending')}
              />
            ),
          },
        ]}
        rows={list.rows as AttendanceRow[]}
        rowKey={(r) => r.id}
        page={list.page}
        perPage={list.perPage}
        total={list.total}
        onPageChange={list.setPage}
        onPerPageChange={list.setPerPage}
        emptyMessage="No attendance records."
      />
  );
}
