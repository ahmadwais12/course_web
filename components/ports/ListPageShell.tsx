'use client';

import React from 'react';
import PageHeader from './PageHeader';
import Filter, { type FilterField } from './Filter';
import SectionPanel from './SectionPanel';
import DataTable, { type DataColumn } from './DataTable';
import PortButton from './PortButton';

/** @deprecated Prefer FilterField from `@/components/ports` — kept for existing list pages. */
export type ListFilter = FilterField;

type ListPageShellProps<T> = {
  title: string;
  description?: string;
  pill?: string;
  /** Primary CTA (e.g. Add) */
  primaryAction?: { label: string; onClick: () => void };
  /** Extra header buttons shown before the primary CTA (e.g. reports, export). */
  secondaryActions?: React.ReactNode;
  search: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;
  filters?: ListFilter[];
  onResetFilters?: () => void;
  columns: DataColumn<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  loading?: boolean;
  emptyMessage?: string;
  page: number;
  perPage: number;
  total: number;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
  children?: React.ReactNode;
  dateFrom?: string;
  dateTo?: string;
  onDateRangeChange?: (next: { from: string; to: string }) => void;
  filterTitle?: string;
  filterDescription?: string;
};

/**
 * Drop-in list page: header + reusable Filter dialog + table + pagination.
 */
export default function ListPageShell<T>({
  title,
  description,
  pill = 'LIVE DATA',
  primaryAction,
  secondaryActions,
  search,
  onSearchChange,
  searchPlaceholder,
  filters = [],
  onResetFilters,
  columns,
  rows,
  rowKey,
  loading,
  emptyMessage,
  page,
  perPage,
  total,
  onPageChange,
  onPerPageChange,
  children,
  dateFrom,
  dateTo,
  onDateRangeChange,
  filterTitle = 'Filters',
  filterDescription = 'Choose date range and options, then apply to update the table.',
}: ListPageShellProps<T>) {
  return (
    <div className="min-w-0 space-y-4 animate-fade-up">
      <PageHeader
        title={title}
        description={description}
        pill={loading ? 'LOADING…' : pill}
        pillTone={loading ? 'neutral' : 'live'}
        actions={
          primaryAction || secondaryActions ? (
            <div className="flex flex-wrap items-center gap-2">
              {secondaryActions}
              {primaryAction && (
                <PortButton variant="primary" onClick={primaryAction.onClick}>
                  {primaryAction.label}
                </PortButton>
              )}
            </div>
          ) : undefined
        }
      />

      {children}

      <Filter
        title={filterTitle}
        description={filterDescription}
        search={search}
        onSearchChange={onSearchChange}
        searchPlaceholder={searchPlaceholder}
        filters={filters}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateRangeChange={onDateRangeChange}
        onReset={onResetFilters}
      />

      <SectionPanel description={`Total: ${total}`} bodyClassName="pt-2">
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={rowKey}
          loading={loading}
          emptyMessage={emptyMessage}
          page={page}
          perPage={perPage}
          total={total}
          onPageChange={onPageChange}
          onPerPageChange={onPerPageChange}
        />
      </SectionPanel>
    </div>
  );
}
