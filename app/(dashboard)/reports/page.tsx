'use client';

import React, { useState } from 'react';
import { ListPageShell, StatusChip } from '@/components/ports';
import { useListQuery } from '@/hooks/useListQuery';

type Report = {
  id: string;
  name: string;
  type: string;
  period: string;
  status: string;
};

const DEMO: Report[] = [
  { id: '1', name: 'Monthly enrollment', type: 'Academic', period: 'Mar 2026', status: 'ready' },
  { id: '2', name: 'Fee collection', type: 'Finance', period: 'Mar 2026', status: 'ready' },
  { id: '3', name: 'Attendance summary', type: 'Academic', period: 'Feb 2026', status: 'draft' },
  { id: '4', name: 'Payroll export', type: 'HR', period: 'Feb 2026', status: 'ready' },
];

export default function ReportsPage() {
  const [type, setType] = useState('');
  const list = useListQuery({
    items: DEMO as (Report & Record<string, unknown>)[],
    searchKeys: ['name', 'type', 'period'],
    filterKey: type,
    filterFn: (item) => !type || item.type === type,
  });

  return (
      <ListPageShell
        title="Reports"
        description="Exportable institute reports"
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search reports…"
        onResetFilters={() => {
          list.reset();
          setType('');
        }}
        filters={[
          {
            key: 'type',
            label: 'Type',
            value: type,
            options: [
              { value: 'Academic', label: 'Academic' },
              { value: 'Finance', label: 'Finance' },
              { value: 'HR', label: 'HR' },
            ],
            onChange: setType,
          },
        ]}
        columns={[
          { key: 'name', header: 'Report' },
          { key: 'type', header: 'Type' },
          { key: 'period', header: 'Period' },
          {
            key: 'status',
            header: 'Status',
            render: (r) => (
              <StatusChip label={r.status} tone={r.status === 'ready' ? 'green' : 'gray'} />
            ),
          },
        ]}
        rows={list.rows as Report[]}
        rowKey={(r) => r.id}
        page={list.page}
        perPage={list.perPage}
        total={list.total}
        onPageChange={list.setPage}
        onPerPageChange={list.setPerPage}
        emptyMessage="No reports found."
      />
  );
}
