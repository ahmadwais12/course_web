'use client';

import React, { useState } from 'react';
import { ListPageShell, StatusChip } from '@/components/ports';
import { useListQuery } from '@/hooks/useListQuery';

type Salary = {
  id: string;
  name: string;
  role: string;
  amount: number;
  month: string;
  status: string;
};

const DEMO: Salary[] = [
  { id: '1', name: 'John Teacher', role: 'Teacher', amount: 1200, month: 'Mar 2026', status: 'paid' },
  { id: '2', name: 'Lisa Admin', role: 'Admin', amount: 1500, month: 'Mar 2026', status: 'pending' },
  { id: '3', name: 'Omar Staff', role: 'Staff', amount: 900, month: 'Mar 2026', status: 'paid' },
];

export default function SalariesPage() {
  const [status, setStatus] = useState('');
  const list = useListQuery({
    items: DEMO as (Salary & Record<string, unknown>)[],
    searchKeys: ['name', 'role', 'month'],
    filterKey: status,
    filterFn: (item) => !status || item.status === status,
  });

  return (
      <ListPageShell
        title="Salaries"
        description="Staff payroll with search and status filter"
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search staff…"
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
              { value: 'paid', label: 'Paid' },
              { value: 'pending', label: 'Pending' },
            ],
            onChange: setStatus,
          },
        ]}
        columns={[
          { key: 'name', header: 'Employee' },
          { key: 'role', header: 'Role' },
          {
            key: 'amount',
            header: 'Amount',
            align: 'right',
            render: (r) => `$${r.amount.toLocaleString()}`,
          },
          { key: 'month', header: 'Month' },
          {
            key: 'status',
            header: 'Status',
            render: (r) => (
              <StatusChip label={r.status} tone={r.status === 'paid' ? 'green' : 'gold'} />
            ),
          },
        ]}
        rows={list.rows as Salary[]}
        rowKey={(r) => r.id}
        page={list.page}
        perPage={list.perPage}
        total={list.total}
        onPageChange={list.setPage}
        onPerPageChange={list.setPerPage}
        emptyMessage="No salary records."
      />
  );
}
