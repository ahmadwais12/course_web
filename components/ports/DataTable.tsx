'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import EmptyState from './EmptyState';
import { TableSkeleton } from './Skeleton';
import Pagination from './Pagination';

export type DataColumn<T> = {
  key: string;
  header: string;
  className?: string;
  align?: 'left' | 'right' | 'center';
  render?: (row: T, index: number) => React.ReactNode;
};

type DataTableProps<T> = {
  columns: DataColumn<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
  /** Pagination (client or server) */
  page?: number;
  perPage?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  onPerPageChange?: (perPage: number) => void;
};

/** Shared table design + optional pagination footer */
export default function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  emptyMessage = 'No data found.',
  className,
  page,
  perPage,
  total,
  onPageChange,
  onPerPageChange,
}: DataTableProps<T>) {
  const showPager =
    typeof page === 'number' &&
    typeof perPage === 'number' &&
    typeof total === 'number' &&
    onPageChange &&
    onPerPageChange;

  return (
    <div className={cn('w-full', className)}>
      {loading ? (
        <TableSkeleton rows={6} cols={columns.length} />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr>
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className={cn(
                        'px-3 py-2 text-[11px] font-medium text-muted-foreground border-b border-border',
                        col.align === 'right' && 'text-right',
                        col.align === 'center' && 'text-center',
                        col.className
                      )}
                    >
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={rowKey(row, index)} className="hover:bg-muted/40">
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn(
                          'px-3 py-2.5 text-sm text-foreground border-b border-border',
                          col.align === 'right' && 'text-right',
                          col.align === 'center' && 'text-center',
                          col.className
                        )}
                      >
                        {col.render
                          ? col.render(row, index)
                          : String((row as Record<string, unknown>)[col.key] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && <EmptyState message={emptyMessage} />}
          </div>
          {showPager && (
            <Pagination
              page={page!}
              perPage={perPage!}
              total={total!}
              onPageChange={onPageChange!}
              onPerPageChange={onPerPageChange!}
              disabled={loading}
            />
          )}
        </>
      )}
    </div>
  );
}
