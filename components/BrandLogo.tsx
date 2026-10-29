'use client';

import React from 'react';
import { useTheme } from '@/context/ThemeContext';
import { APP_NAME, getLocalLogoPath } from '@/lib/branding';
import { cn } from '@/lib/utils';

type BrandLogoProps = {
  /** Height of the FLOW wordmark in pixels. Width follows the artwork ratio. */
  size?: number;
  showName?: boolean;
  className?: string;
  nameClassName?: string;
};

const ASPECT = 828 / 272;
const MARK_SRC = getLocalLogoPath('light');

/**
 * Colored DreamFlow wordmark using the home-page sky → blue → indigo gradient.
 */
export default function BrandLogo({
  size = 56,
  showName = true,
  className,
  nameClassName,
}: BrandLogoProps) {
  const { resolvedTheme } = useTheme();
  const width = Math.round(size * ASPECT);
  const dark = resolvedTheme === 'dark';

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <div className="relative" style={{ width, height: size }}>
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-3 rounded-full bg-gradient-to-r from-sky-400/45 via-blue-600/30 to-indigo-600/45 blur-xl"
        />
        <div
          role="img"
          aria-label={`${APP_NAME} logo`}
          className={cn(
            'relative h-full w-full',
            dark
              ? 'bg-gradient-to-r from-sky-300 via-blue-400 to-indigo-400'
              : 'bg-gradient-to-r from-sky-400 via-blue-600 to-indigo-600'
          )}
          style={{
            WebkitMaskImage: `url(${MARK_SRC})`,
            maskImage: `url(${MARK_SRC})`,
            WebkitMaskRepeat: 'no-repeat',
            maskRepeat: 'no-repeat',
            WebkitMaskSize: 'contain',
            maskSize: 'contain',
            WebkitMaskPosition: 'center',
            maskPosition: 'center',
          }}
        />
      </div>
      {showName && (
        <h1
          className={cn(
            'bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 bg-clip-text text-3xl font-black tracking-tight text-transparent',
            nameClassName
          )}
        >
          {APP_NAME}
        </h1>
      )}
    </div>
  );
}
