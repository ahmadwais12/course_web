'use client';

import React from 'react';
import { Search, Filter } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { cn } from '@/lib/utils';

interface SearchFiltersProps {
  onSearch: (query: string) => void;
  onFilter: (filter: string) => void;
  filterOptions: string[];
  placeholder?: string;
}

export default function SearchFilters({ onSearch, onFilter, filterOptions, placeholder }: SearchFiltersProps) {
  const { t, isRTL } = useLanguage();

  return (
    <div className="flex flex-col md:flex-row gap-4 mb-8">
      <div className="relative flex-1">
        <Search className={cn("absolute top-1/2 -translate-y-1/2 text-muted-foreground", isRTL ? "right-4" : "left-4")} size={20} />
        <input 
          type="text" 
          placeholder={placeholder || t.search}
          onChange={(e) => onSearch(e.target.value)}
          className={cn(
            "w-full py-3 bg-card border border-border rounded-2xl text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/20 focus:border-primary outline-none transition-all font-medium shadow-sm",
            isRTL ? "pr-12 pl-4" : "pl-12 pr-4"
          )}
        />
      </div>
      <div className="flex items-center gap-2 bg-card border border-border rounded-2xl px-4 py-3 shadow-sm">
        <Filter size={20} className="text-muted-foreground" />
        <select 
          onChange={(e) => onFilter(e.target.value)}
          className="bg-transparent border-none outline-none text-sm font-bold text-foreground cursor-pointer"
        >
          <option value="">{isRTL ? 'همه فیلترها' : 'All Filters'}</option>
          {filterOptions.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
