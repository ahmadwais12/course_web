'use client';

import React, { useState } from 'react';
import { ListPageShell, StatusChip } from '@/components/ports';
import { useListQuery } from '@/hooks/useListQuery';

type Feedback = {
  id: string;
  from: string;
  subject: string;
  rating: number;
  status: string;
  date: string;
};

const DEMO: Feedback[] = [
  { id: '1', from: 'Parent A', subject: 'Course quality', rating: 5, status: 'open', date: '2026-03-18' },
  { id: '2', from: 'Student B', subject: 'Schedule', rating: 3, status: 'closed', date: '2026-03-15' },
  { id: '3', from: 'Teacher C', subject: 'Classroom', rating: 4, status: 'open', date: '2026-03-12' },
];

export default function FeedbackPage() {
  const [status, setStatus] = useState('');
  const list = useListQuery({
    items: DEMO as (Feedback & Record<string, unknown>)[],
    searchKeys: ['from', 'subject'],
    filterKey: status,
    filterFn: (item) => !status || item.status === status,
  });

  return (
      <ListPageShell
        title="Feedback"
        description="Student and parent feedback"
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search feedback…"
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
              { value: 'open', label: 'Open' },
              { value: 'closed', label: 'Closed' },
            ],
            onChange: setStatus,
          },
        ]}
        columns={[
          { key: 'from', header: 'From' },
          { key: 'subject', header: 'Subject' },
          { key: 'rating', header: 'Rating', align: 'right' },
          { key: 'date', header: 'Date' },
          {
            key: 'status',
            header: 'Status',
            render: (r) => (
              <StatusChip label={r.status} tone={r.status === 'open' ? 'gold' : 'gray'} />
            ),
          },
        ]}
        rows={list.rows as Feedback[]}
        rowKey={(r) => r.id}
        page={list.page}
        perPage={list.perPage}
        total={list.total}
        onPageChange={list.setPage}
        onPerPageChange={list.setPerPage}
        emptyMessage="No feedback found."
      />
  );
}
