'use client';

import React from 'react';
import PageHeader from './PageHeader';
import FilterSection from './FilterSection';
import SectionPanel from './SectionPanel';
import DataTable, { type DataColumn } from './DataTable';
import PortButton from './PortButton';
import Dropdown, { type SelectOption } from './Dropdown';

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
}: ListPageShellProps<T>) {
  return (
    <div className="space-y-4">
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

      <FilterSection
        search={search}
        onSearchChange={onSearchChange}
        searchPlaceholder={searchPlaceholder}
        onReset={onResetFilters}
        activeCount={filters.filter((f) => Boolean(f.value)).length}
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
