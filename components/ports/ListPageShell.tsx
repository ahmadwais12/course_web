'use client';

import React from 'react';
import PageHeader from './PageHeader';
import FilterSection from './FilterSection';
import SectionPanel from './SectionPanel';
import DataTable, { type DataColumn } from './DataTable';
import PortButton from './PortButton';
import Dropdown, { type SelectOption } from './Dropdown';
import DateFilterBar from '@/components/dashboards/DateFilterBar';

export type ListFilter = {
  key: string;
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
};

type ListPageShellProps<T> = {
  title: string;
  description?: string;
  pill?: string;
  /** Primary CTA (e.g. Add) */
  primaryAction?: { label: string; onClick: () => void };
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
};

/**
 * Drop-in list page: header + search/filters + table + per-fetch pagination.
 * Use on Students, Courses, Payments, etc.
 */
export default function ListPageShell<T>({
  title,
  description,
  pill = 'LIVE DATA',
  primaryAction,
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
}: ListPageShellProps<T>) {
  return (
    <div className="space-y-4 animate-fade-up">
      <PageHeader
        title={title}
        description={description}
        pill={loading ? 'LOADING…' : pill}
        pillTone={loading ? 'neutral' : 'live'}
        actions={
          primaryAction ? (
            <PortButton variant="primary" onClick={primaryAction.onClick}>
              {primaryAction.label}
            </PortButton>
          ) : undefined
        }
      />

      {children}

      {onDateRangeChange && dateFrom && dateTo && (
        <div className="rounded-2xl border border-border bg-card p-3 shadow-card sm:p-4">
          <DateFilterBar from={dateFrom} to={dateTo} onChange={onDateRangeChange} />
        </div>
      )}

      <FilterSection
        search={search}
        onSearchChange={onSearchChange}
        searchPlaceholder={searchPlaceholder}
        onReset={onResetFilters}
        activeCount={
          filters.filter((f) => Boolean(f.value)).length + (dateFrom || dateTo ? 1 : 0)
        }
      >
        {filters.map((f) => (
          <Dropdown
            key={f.key}
            label={f.label}
            value={f.value}
            onChange={f.onChange}
            options={f.options}
            placeholder={`All ${f.label.toLowerCase()}`}
            filter={f.options.length > 6}
            clearable
          />
        ))}
      </FilterSection>

      <SectionPanel
        title={title}
        description={`Total: ${total}`}
        bodyClassName="pt-2"
      >
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
