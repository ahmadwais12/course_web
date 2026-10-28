'use client';

import React, { useState } from 'react';
import { ListPageShell, StatusChip } from '@/components/ports';
import { useListQuery } from '@/hooks/useListQuery';

type Book = {
  id: string;
  title: string;
  author: string;
  category: string;
  status: string;
};

const DEMO: Book[] = [
  { id: '1', title: 'English Grammar in Use', author: 'Murphy', category: 'Grammar', status: 'available' },
  { id: '2', title: 'IELTS Trainer', author: 'Cambridge', category: 'Exam', status: 'borrowed' },
  { id: '3', title: 'Oxford Dictionary', author: 'OUP', category: 'Reference', status: 'available' },
  { id: '4', title: 'Speak Out Intermediate', author: 'Pearson', category: 'Speaking', status: 'available' },
];

export default function BooksPage() {
  const [category, setCategory] = useState('');
  const list = useListQuery({
    items: DEMO as (Book & Record<string, unknown>)[],
    searchKeys: ['title', 'author', 'category'],
    filterKey: category,
    filterFn: (item) => !category || item.category === category,
  });

  return (
      <ListPageShell
        title="Books"
        description="Library catalog"
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search title or author…"
        onResetFilters={() => {
          list.reset();
          setCategory('');
        }}
        filters={[
          {
            key: 'category',
            label: 'Category',
            value: category,
            options: [
              { value: 'Grammar', label: 'Grammar' },
              { value: 'Exam', label: 'Exam' },
              { value: 'Reference', label: 'Reference' },
              { value: 'Speaking', label: 'Speaking' },
            ],
            onChange: setCategory,
          },
        ]}
        columns={[
          { key: 'title', header: 'Title' },
          { key: 'author', header: 'Author' },
          { key: 'category', header: 'Category' },
          {
            key: 'status',
            header: 'Status',
            render: (r) => (
              <StatusChip
                label={r.status}
                tone={r.status === 'available' ? 'green' : 'gold'}
              />
            ),
          },
        ]}
        rows={list.rows as Book[]}
        rowKey={(r) => r.id}
        page={list.page}
        perPage={list.perPage}
        total={list.total}
        onPageChange={list.setPage}
        onPerPageChange={list.setPerPage}
        emptyMessage="No books found."
      />
  );
}
