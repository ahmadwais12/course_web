'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { Dropdown, SearchBar } from '@/components/ports';

interface SearchFiltersProps {
  onSearch: (query: string) => void;
  onFilter: (filter: string) => void;
  filterOptions: string[];
  placeholder?: string;
}

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
    <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end">
      <SearchBar
        value={query}
        onChange={(value) => {
          setQuery(value);
          onSearch(value);
        }}
        placeholder={placeholder || t.search}
        className="flex-1"
      />
      <Dropdown
        label="Filter"
        value={filter}
        onChange={(value) => {
          setFilter(value);
          onFilter(value);
        }}
        options={filterOptions.map((opt) => ({ value: opt, label: opt }))}
        placeholder="All filters"
        clearable
        className="md:w-56"
      />
    </div>
  );
}
