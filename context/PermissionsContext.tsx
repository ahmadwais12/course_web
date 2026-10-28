'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { can as canFn, canAll as canAllFn, canAny as canAnyFn } from '@/lib/rbac';

type PermissionsContextType = {
  abilities: string[];
  loading: boolean;
  refresh: () => Promise<void>;
  can: (permission: string) => boolean;
  canAny: (permissions: string[]) => boolean;
  canAll: (permissions: string[]) => boolean;
};

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const [abilities, setAbilities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/abilities');
      if (!res.ok) {
        setAbilities([]);
        return;
      }
      const data = await res.json();
      setAbilities(Array.isArray(data) ? data : data?.abilities ?? []);
    } catch {
      setAbilities([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({
      abilities,
      loading,
      refresh,
      can: (p: string) => canFn(abilities, p),
      canAny: (ps: string[]) => canAnyFn(abilities, ps),
      canAll: (ps: string[]) => canAllFn(abilities, ps),
    }),
    [abilities, loading, refresh]
  );

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const ctx = useContext(PermissionsContext);
  if (!ctx) throw new Error('usePermissions must be used within PermissionsProvider');
  return ctx;
}
