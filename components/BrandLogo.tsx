'use client';

import React, { useMemo, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import {
  APP_NAME,
  getLocalLogoPath,
  getSupabaseLogoUrl,
} from '@/lib/branding';
import { cn } from '@/lib/utils';

type BrandLogoProps = {
  size?: number;
  showName?: boolean;
  className?: string;
  nameClassName?: string;
};

/**
 * DreamFlow logo: prefers Supabase Storage public URL (`branding` bucket),
 * falls back to local assets from course_users.
 */
export default function BrandLogo({
  size = 140,
  showName = true,
  className,
  nameClassName,
}: BrandLogoProps) {
  const { theme } = useTheme();
  const mode = theme === 'dark' ? 'dark' : 'light';
  const [useLocal, setUseLocal] = useState(false);

  const src = useMemo(() => {
    if (useLocal) return getLocalLogoPath(mode);
    try {
      return getSupabaseLogoUrl(mode);
    } catch {
      return getLocalLogoPath(mode);
    }
  }, [mode, useLocal]);

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={`${APP_NAME} logo`}
        width={size}
        height={size}
        className="object-contain"
        style={{ width: size, height: size }}
        onError={() => setUseLocal(true)}
      />
      {showName && (
        <h1
          className={cn(
            'text-3xl font-black tracking-tight text-foreground',
            nameClassName
          )}
        >
          {APP_NAME}
        </h1>
      )}
    </div>
  );
}
