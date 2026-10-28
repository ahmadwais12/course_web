'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type UseListQueryOptions<T> = {
  items: T[];
  searchKeys?: (keyof T)[];
  initialPerPage?: number;
  filterFn?: (item: T) => boolean;
  /** Stable string that changes when filters change (avoids page reset loops) */
  filterKey?: string;
};

/** Client-side search + filter + pagination for list pages */
export function useListQuery<T extends Record<string, unknown>>({
  items,
  searchKeys = [],
  initialPerPage = 10,
  filterFn,
  filterKey = '',
}: UseListQueryOptions<T>) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(initialPerPage);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (filterFn && !filterFn(item)) return false;
      if (!q || searchKeys.length === 0) return true;
      return searchKeys.some((key) =>
        String(item[key] ?? '')
          .toLowerCase()
          .includes(q)
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- filterKey captures filter identity
  }, [items, search, searchKeys, filterKey, filterFn]);

  useEffect(() => {
    setPage(1);
  }, [search, perPage, filterKey, items.length]);

  const total = filtered.length;
  const rows = useMemo(() => {
    const start = (page - 1) * perPage;
    return filtered.slice(start, start + perPage);
  }, [filtered, page, perPage]);

  const reset = useCallback(() => {
    setSearch('');
    setPage(1);
  }, []);

  return {
    search,
    setSearch,
    page,
    setPage,
    perPage,
    setPerPage,
    rows,
    total,
    filtered,
    reset,
  };
}
