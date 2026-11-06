'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { Filter } from '@/components/ports';

interface SearchFiltersProps {
  onSearch: (query: string) => void;
  onFilter: (filter: string) => void;
  filterOptions: string[];
  placeholder?: string;
}

/** Legacy helper — wraps the shared Ports `Filter` dialog. */
export default function SearchFilters({
  onSearch,
  onFilter,
  filterOptions,
  placeholder,
}: SearchFiltersProps) {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('');

  return (
    <Filter
      search={query}
      onSearchChange={(value) => {
        setQuery(value);
        onSearch(value);
      }}
      searchPlaceholder={placeholder || t.search}
      title="Filters"
      description="Pick a filter option, then apply."
      onReset={() => {
        setQuery('');
        setFilter('');
        onSearch('');
        onFilter('');
      }}
      filters={[
        {
          key: 'filter',
          label: 'Filter',
          value: filter,
          options: filterOptions.map((opt) => ({ value: opt, label: opt })),
          onChange: (value) => {
            setFilter(value);
            onFilter(value);
          },
        },
      ]}
    />
  );
}
